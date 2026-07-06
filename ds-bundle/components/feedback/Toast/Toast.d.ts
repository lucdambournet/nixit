import * as React from 'react';

/**
 * Toast — from nixit@0.1.0.
 */
export interface ToastProps {
  message: string;
  type?: "default" | "success" | "warning" | "error";
  visible?: boolean;
  onClose?: () => void;
  action?: { label: string; onClick: () => void };
  style?: React.CSSProperties;
}

export declare const Toast: React.ComponentType<ToastProps>;
