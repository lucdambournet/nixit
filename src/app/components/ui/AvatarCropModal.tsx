import React, { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from './Button';
import { Card } from './Card';
import { cropImageToBlob } from '../../lib/imageCrop';

interface AvatarCropModalProps {
  src: string;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}

export function AvatarCropModal({ src, onCancel, onSave }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await cropImageToBlob(src, croppedAreaPixels);
      onSave(blob);
    } catch {
      setError('Could not crop this photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop profile photo"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(20,14,40,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card variant="elevated" padding="lg" style={{ width: 360, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          position: 'relative', width: '100%', height: 280,
          background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
          />
        </div>

        <input
          type="range"
          aria-label="Zoom"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{ width: '100%' }}
        />

        {error && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
            color: 'var(--color-danger)',
            lineHeight: 'var(--leading-snug)',
          }}>
            {error}
          </span>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
