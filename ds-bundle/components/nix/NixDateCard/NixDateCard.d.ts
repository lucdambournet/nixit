import * as React from 'react';

/**
 * NixDateCard — from nixit@0.1.0.
 */
export interface NixDateCardProps {
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

export declare const NixDateCard: React.ComponentType<NixDateCardProps>;
