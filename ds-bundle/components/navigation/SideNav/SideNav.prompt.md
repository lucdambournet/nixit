SideNav from nixit. Use via `window.NixItDS.SideNav` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface SideNavProps {
  items: { id: string; label: string; icon?: React.ReactNode; badge?: number }[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  logo?: React.ReactNode;
  userAvatar?: React.ReactNode;
  userName?: string;
  onUserClick?: () => void;
  userActive?: boolean;
  onSignOut?: () => void;
  style?: React.CSSProperties;
}
```
