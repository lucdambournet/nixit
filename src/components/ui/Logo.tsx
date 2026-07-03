import React from 'react';

// Design-system logo treatment (see NixIt DS readme → assets/logo.png):
// the primary wordmark is a PNG on a white canvas — hue-rotate aligns it
// to the lavender palette and multiply blending drops the white canvas
// on any light surface, so it works on cards and the blob background.
const LOGO_FILTER = 'hue-rotate(-35deg) saturate(0.85)';

// The artwork sits padded inside a square canvas; crop boxes (as fractions
// of the canvas) trim to the glyphs so sizing by height behaves like a
// normal wordmark image. `mark` crops to the "N" for icon-only contexts.
const CROPS = {
  full: { x: 0.11, y: 0.25, w: 0.81, h: 0.49 },
  mark: { x: 0.12, y: 0.37, w: 0.27, h: 0.35 },
};

interface LogoProps {
  height?: number;
  variant?: keyof typeof CROPS;
  style?: React.CSSProperties;
}

export function Logo({ height = 32, variant = 'full', style }: LogoProps) {
  const crop = CROPS[variant];
  const imgSize = height / crop.h;
  return (
    <div
      role="img"
      aria-label="NixIt"
      style={{
        height,
        width: height * (crop.w / crop.h),
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src="/assets/logo.png"
        alt=""
        style={{
          position: 'absolute',
          width: imgSize,
          height: imgSize,
          maxWidth: 'none',
          left: -crop.x * imgSize,
          top: -crop.y * imgSize,
          filter: LOGO_FILTER,
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
}
