import * as React from 'react';

/**
 * Button — from nixit@0.1.0.
 */
export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "purple";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export declare const Button: React.ComponentType<ButtonProps>;
