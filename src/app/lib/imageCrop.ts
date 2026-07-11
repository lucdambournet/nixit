export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputedCrop {
  source: CropRect;
  outputWidth: number;
  outputHeight: number;
}

/**
 * Pure geometry step: the source rect (from react-easy-crop's croppedAreaPixels)
 * passes through unchanged; the output is always forced to a square of
 * `targetSize`, independent of the input rect's own aspect ratio.
 */
export function computeCropPixels(cropRect: CropRect, targetSize = 512): ComputedCrop {
  return {
    source: cropRect,
    outputWidth: targetSize,
    outputHeight: targetSize,
  };
}

/**
 * Draws the cropped region of `imageSrc` (a data URL or object URL) onto an
 * offscreen canvas and resolves a JPEG Blob at the computed output size.
 */
export function cropImageToBlob(imageSrc: string, cropRect: CropRect, targetSize = 512): Promise<Blob> {
  const { source, outputWidth, outputHeight } = computeCropPixels(cropRect, targetSize);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context not available')); return; }

      ctx.drawImage(img, source.x, source.y, source.width, source.height, 0, 0, outputWidth, outputHeight);

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Failed to encode cropped image')); return; }
        resolve(blob);
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = imageSrc;
  });
}
