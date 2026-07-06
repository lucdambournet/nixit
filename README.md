# NixIt

Vite + React app scaffold for the NixIt cohort-based nicotine cessation experience.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Fill in the Supabase values in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. Create your Supabase schema using `supabase/schema.sql`.

5. Seed sample data:

   ```bash
   npm run seed
   ```

6. Start the dev server:
   ```bash
   npm run dev
   ```

## Production

The production app is deployed to GitHub Pages from the `main` branch via [deploy-pages.yml](.github/workflows/deploy-pages.yml).

- Production URL: https://lucdambournet.github.io/nixit/
- SPA routing fallback is published as `404.html` so dashboard and enrollment routes can refresh correctly.
- Build-time frontend environment values are the public Supabase URL and anon key for the NixIt project.

## Supabase schema

The initial schema includes:

- `users`
- `nix_dates`
- `cohorts`
- `cohort_members`
- helper function `join_cohort`

## Sprint 1 focus

- Email/password signup and profile creation
- Cohort enrollment with available Nix Dates
- Active cohort dashboard with shared timer
- Local Supabase schema and seed data
