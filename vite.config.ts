import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";

dotenv.config();

async function findUserByEmail(
  supabaseUrl: string,
  headers: Record<string, string>,
  email: string,
) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers,
    },
  );

  if (!response.ok) return null;
  const result = await response.json();
  if (Array.isArray(result)) return result[0];
  return result?.users?.[0] ?? null;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "service-login-middleware",
      configureServer(server) {
        server.middlewares.use("/service-login", async (req, res, next) => {
          if (req.method !== "POST") {
            return next();
          }

          let body = "";
          for await (const chunk of req) {
            body += chunk;
          }

          try {
            const data = JSON.parse(body);
            const supabaseUrl = process.env.VITE_SUPABASE_URL;
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !serviceRoleKey) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error:
                    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env",
                }),
              );
              return;
            }

            const headers = {
              "Content-Type": "application/json",
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            };

            const createResponse = await fetch(
              `${supabaseUrl}/auth/v1/admin/users`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({
                  email: data.email,
                  password: data.password,
                  email_confirm: true,
                }),
              },
            );

            const createResult = await createResponse.json();
            let user: any = null;
            const createErrorCode =
              createResult.api_error_code || createResult.error_code;
            const createErrorMessage =
              typeof createResult.error === "string"
                ? createResult.error
                : createResult.message;

            if (createResponse.ok) {
              user = createResult;
            } else if (
              createErrorCode === "USER_ALREADY_EXISTS" ||
              createErrorCode === "email_exists" ||
              (typeof createErrorMessage === "string" &&
                createErrorMessage.toLowerCase().includes("already"))
            ) {
              user = await findUserByEmail(supabaseUrl, headers, data.email);
              if (!user) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error:
                      "Existing user could not be loaded after user already exists",
                  }),
                );
                return;
              }

              const updateResponse = await fetch(
                `${supabaseUrl}/auth/v1/admin/users/${user.id}`,
                {
                  method: "PUT",
                  headers,
                  body: JSON.stringify({
                    password: data.password,
                    email_confirm: true,
                  }),
                },
              );
              const updateResult = await updateResponse.json();
              if (!updateResponse.ok) {
                res.statusCode = updateResponse.status;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error:
                      updateResult.message ||
                      "Unable to update existing user password",
                    details: updateResult,
                  }),
                );
                return;
              }
              user = updateResult;
            } else {
              res.statusCode = createResponse.status;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: createResult.message || "Unable to create user",
                  details: createResult,
                }),
              );
              return;
            }

            if (!user?.id) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error:
                    "No user ID returned from Supabase admin create/update",
                }),
              );
              return;
            }

            const profileHeaders = {
              "Content-Type": "application/json",
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            };

            const profileByIdResponse = await fetch(
              `${supabaseUrl}/rest/v1/users?id=eq.${user.id}&select=*`,
              {
                method: "GET",
                headers: profileHeaders,
              },
            );
            if (!profileByIdResponse.ok) {
              const errorBody = await profileByIdResponse.text();
              res.statusCode = profileByIdResponse.status;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: "Unable to read profile row by id",
                  details: errorBody,
                }),
              );
              return;
            }

            const profileById = await profileByIdResponse.json();
            if (!Array.isArray(profileById) || profileById.length === 0) {
              const profileByEmailResponse = await fetch(
                `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(data.email)}&select=*`,
                {
                  method: "GET",
                  headers: profileHeaders,
                },
              );
              if (!profileByEmailResponse.ok) {
                const errorBody = await profileByEmailResponse.text();
                res.statusCode = profileByEmailResponse.status;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "Unable to read profile row by email",
                    details: errorBody,
                  }),
                );
                return;
              }

              const profileByEmail = await profileByEmailResponse.json();
              if (
                Array.isArray(profileByEmail) &&
                profileByEmail.length > 0 &&
                profileByEmail[0].id !== user.id
              ) {
                const deleteResponse = await fetch(
                  `${supabaseUrl}/rest/v1/users?id=eq.${profileByEmail[0].id}`,
                  {
                    method: "DELETE",
                    headers: profileHeaders,
                  },
                );
                if (!deleteResponse.ok) {
                  const errorBody = await deleteResponse.text();
                  res.statusCode = deleteResponse.status;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      error: "Unable to delete stale profile row",
                      details: errorBody,
                    }),
                  );
                  return;
                }
              }
            }

            const profileResponse = await fetch(
              `${supabaseUrl}/rest/v1/users`,
              {
                method: "POST",
                headers: {
                  ...profileHeaders,
                  Prefer: "return=representation,resolution=merge-duplicates",
                },
                body: JSON.stringify({
                  id: user.id,
                  email: data.email,
                  username: data.username,
                }),
              },
            );
            const profileResult = await profileResponse.json();
            if (!profileResponse.ok) {
              res.statusCode = profileResponse.status;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: "Unable to create or update profile row",
                  details: profileResult,
                }),
              );
              return;
            }

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ success: true, user, profile: profileResult }),
            );
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
              }),
            );
          }
        });
      },
    },
  ],
  server: {
    port: 4173,
  },
});
