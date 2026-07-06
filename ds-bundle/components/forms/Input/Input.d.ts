import * as React from 'react';

/**
 * Input — from nixit@0.1.0.
 */
export interface InputProps {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  inputStyle?: React.CSSProperties;
  type?: string;
  disabled?: boolean;
  value?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

export declare const Input: React.ComponentType<InputProps>;
