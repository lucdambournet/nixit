import * as React from 'react';

/**
 * SideNav — from nixit@0.1.0.
 */
export interface SideNavProps {
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

export declare const SideNav: React.ComponentType<SideNavProps>;
