import * as React from 'react';

/**
 * Card — from nixit@0.1.0.
 */
export interface CardProps {
  variant?: "default" | "elevated" | "flat" | "lavender" | "purple" | "glass";
  padding?: "none" | "sm" | "md" | "lg";
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare const Card: React.ComponentType<CardProps>;
