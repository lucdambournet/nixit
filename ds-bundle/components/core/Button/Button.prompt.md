Button from nixit. Use via `window.NixItDS.Button` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "purple";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
```
