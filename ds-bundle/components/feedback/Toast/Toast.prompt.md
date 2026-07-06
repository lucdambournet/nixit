Toast from nixit. Use via `window.NixItDS.Toast` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ToastProps {
  message: string;
  type?: "default" | "success" | "warning" | "error";
  visible?: boolean;
  onClose?: () => void;
  action?: { label: string; onClick: () => void };
  style?: React.CSSProperties;
}
```
