import { describe, expect, it } from 'vitest';
import { computeCropPixels } from '../../src/app/lib/imageCrop';

describe('computeCropPixels', () => {
  it('passes the source rect through unchanged and fixes output to the default target size', () => {
    const result = computeCropPixels({ x: 10, y: 20, width: 200, height: 200 });
    expect(result.source).toEqual({ x: 10, y: 20, width: 200, height: 200 });
    expect(result.outputWidth).toBe(512);
    expect(result.outputHeight).toBe(512);
  });

  it('honors a custom target size', () => {
    const result = computeCropPixels({ x: 0, y: 0, width: 80, height: 80 }, 256);
    expect(result.outputWidth).toBe(256);
    expect(result.outputHeight).toBe(256);
  });

  it('forces a square output even when the input rect is not square', () => {
    const result = computeCropPixels({ x: 5, y: 5, width: 300, height: 150 });
    expect(result.outputWidth).toBe(result.outputHeight);
    expect(result.source).toEqual({ x: 5, y: 5, width: 300, height: 150 });
  });

  it('handles a very small crop area (upscale case) without altering the source rect', () => {
    const result = computeCropPixels({ x: 0, y: 0, width: 4, height: 4 });
    expect(result.source).toEqual({ x: 0, y: 0, width: 4, height: 4 });
    expect(result.outputWidth).toBe(512);
  });
});
