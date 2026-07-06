// Design-sync barrel entry — the exact surface synced to claude.ai/design.
// Re-exports only the reusable design-system components, never app screens
// (pages/, ProfileScreen) which import Supabase and crash outside the app.
// Committed durable input — cfg.entry points here; edit exports as the DS grows.
export { Avatar } from '../src/components/ui/Avatar';
export { Badge } from '../src/components/ui/Badge';
export { Button } from '../src/components/ui/Button';
export { Card } from '../src/components/ui/Card';
export { Input } from '../src/components/ui/Input';
export { Logo } from '../src/components/ui/Logo';
export { Toast } from '../src/components/ui/Toast';
export { SideNav } from '../src/components/navigation/SideNav';
export { CohortTimer } from '../src/components/nix/CohortTimer';
export { NixDateCard } from '../src/components/nix/NixDateCard';
