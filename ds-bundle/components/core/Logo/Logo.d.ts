import * as React from 'react';

/**
 * Logo — from nixit@0.1.0.
 */
export interface LogoProps {
  height?: number;
  variant?: "full" | "mark";
  style?: React.CSSProperties;
}

export declare const Logo: React.ComponentType<LogoProps>;
