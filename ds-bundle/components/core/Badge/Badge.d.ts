import * as React from 'react';

/**
 * Badge — from nixit@0.1.0.
 */
export interface BadgeProps {
  variant?: "lavender" | "purple" | "neutral" | "frosted" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare const Badge: React.ComponentType<BadgeProps>;
