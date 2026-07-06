# NixItDS (nixit@0.1.0)

This design system is the published nixit React library, bundled as a single
browser global. All 10 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.NixItDS`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.NixItDS.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Avatar } = window.NixItDS;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Avatar />);
```

## Tokens

162 CSS custom properties from nixit. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (53): `--text-xs`, `--text-sm`, `--text-base`, …
- **spacing** (24): `--space-0`, `--space-1`, `--space-2`, …
- **typography** (14): `--font-display`, `--font-body`, `--font-mono`, …
- **radius** (8): `--radius-xs`, `--radius-sm`, `--radius-md`, …
- **shadow** (7): `--shadow-xs`, `--shadow-sm`, `--shadow-md`, …
- **other** (56): `--leading-none`, `--leading-tight`, `--leading-snug`, …

## Components

### core
- `Avatar`
- `Badge`
- `Button`
- `Card`
- `Logo`

### nix
- `CohortTimer`
- `NixDateCard`

### forms
- `Input`

### navigation
- `SideNav`

### feedback
- `Toast`
