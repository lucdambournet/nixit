import * as React from 'react';

/**
 * Avatar — from nixit@0.1.0.
 */
export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "away" | "busy" | "offline";
  style?: React.CSSProperties;
}

export declare const Avatar: React.ComponentType<AvatarProps>;
