---
name: implement-designs
description: >
  Pull the NixIt Design System from claude.ai/design (project 6b493516-1786-40aa-9d19-9e3a5cb81d75)
  and apply its tokens/components to this repo. Use when the user says "implement the designs",
  "pull the design system", "sync designs down", or references this project's claude.ai/design page.
  Opposite direction of /design-sync (which pushes repo code up to claude.ai/design) — this pulls
  the source-of-truth designs down into the app.
---

# Implement NixIt designs from claude.ai/design

Project: `https://claude.ai/design/p/6b493516-1786-40aa-9d19-9e3a5cb81d75` ("NixIt - Design System").

## Steps

1. Load the `DesignSync` tool if not already available (`ToolSearch(query: "select:DesignSync")`).
2. `DesignSync(list_files, projectId: "6b493516-1786-40aa-9d19-9e3a5cb81d75")` to see current project contents.
3. Fetch what's needed via `DesignSync(get_file, ...)`: at minimum `tokens/colors.css`, `tokens/typography.css`,
   `tokens/spacing.css`, `tokens/effects.css`, `tokens/fonts.css`, `tokens/base.css`, and `readme.md` for
   conventions (voice/tone, component variant rules, blob background usage).
4. Compare fetched token values against `src/styles.css` in this repo (the app consolidates all DS tokens
   into that one file, imported by `src/main.tsx`). Overwrite `src/styles.css` so its CSS custom properties
   (`--lavender-*`, `--purple-*`, `--neutral-*`, `--color-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--text-*`,
   spacing/easing/duration tokens, `.nixit-blob-bg` / `.nixit-dot-bg` utilities) match the project exactly.
   Keep the single-file structure — don't split into `tokens/*.css` imports unless asked.
5. Before overwriting, grep `src` for any component code that references vars NOT in the fetched token set
   (a local addition) so nothing load-bearing gets silently dropped — check `grep -rn "var(--" src --include="*.tsx"`
   against the new token file.
6. Components under `src/components/ui/`, `src/components/navigation/`, `src/components/nix/` should already
   reference the correct token names (Button, Badge, Card, Avatar, Input, Toast, SideNav, CohortTimer,
   NixDateCard) — if the project's remote component `.jsx` previews show styling this repo's `.tsx` doesn't
   (new variant, changed radius/shadow, copy change), update the matching `.tsx` file to match, but don't
   rewrite working component logic wholesale — diff surgically.
7. Verify visually: start the dev server (`npm run dev -- --port <port>`, backgrounded — never a bare `&`
   inside the command, it kills the server when the shell exits), headless-screenshot `/login` and `/signup`
   at minimum (public, no auth needed), confirm lavender blobs, Geo font, frosted-glass buttons, angular
   radii, hue-rotated logo. Kill the dev server when done.
8. Report what changed (or confirm already in sync) with screenshot evidence — don't just claim success from
   reading CSS values.

## Notes

- The asset `public/assets/logo.png` + the `Logo` component's `hue-rotate(-35deg) saturate(0.85)` filter is
  the documented way to align the wordmark to the palette — don't replace it with a differently-colored asset
  unless the project's `assets/logo.png` itself changed.
- Geo is single-weight (400) — bold headings use synthesised bold, a known/accepted limitation, not a bug.
- If `src/styles.css` has diverged with an entirely different palette/font (seen once before: a "blue /
  Space Grotesk" variant), that's drift, not an intentional rebrand — restore the lavender/Geo system from
  the project unless the user explicitly says otherwise.
