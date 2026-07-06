NixDateCard from nixit. Use via `window.NixItDS.NixDateCard` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface NixDateCardProps {
  month: number;
  year: number;
  joined?: number;
  total?: number;
  status?: "upcoming" | "active" | "full" | "past";
  isJoined?: boolean;
  onJoin?: () => void;
  description?: string;
  features?: string[];
  members?: string[];
  style?: React.CSSProperties;
}
```
