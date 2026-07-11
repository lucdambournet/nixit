# Avatar Crop & Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a crop/zoom step (round preview, 1:1) between picking an avatar photo and uploading it, reusing the OS's native camera/gallery picker with no extra button, backed by `react-easy-crop`.

**Architecture:** A pure crop-math module (`src/app/lib/imageCrop.ts`) computes the canvas source rect and fixed 512×512 output; a new `AvatarCropModal` component wraps `react-easy-crop` and calls that module to produce a JPEG `Blob`; `ProfileScreen.tsx`'s existing upload path is changed to accept that `Blob` instead of the raw `File`, with everything downstream (Supabase upload, `users` table update, toast) untouched.

**Tech Stack:** React 18 + TypeScript, Vite, `react-easy-crop` (new dep), Supabase JS client, Vitest (unit), Playwright (e2e).

## Global Constraints

- No CSS files — this codebase styles everything with inline `style={}` objects using CSS custom properties (`var(--...)`). Follow that pattern exactly, do not add a stylesheet.
- Cropped output is always JPEG, fixed 512×512, quality 0.9 — regardless of input file type/dimensions.
- The file `<input>` keeps `accept="image/*"` and must NOT gain a `capture` attribute (that would skip the native camera/gallery chooser and force camera-only).
- Existing validation (image mimetype, ≤5MB) stays in front of the crop step, unchanged.
- Unit tests run via `npm run test` (vitest, `tests/unit/**`). E2e tests run via `npm run test:e2e` (playwright, `tests/e2e/**`, dev server on port 5174, baseURL `http://localhost:5174`).
- Test users/DB access in e2e tests use the `SUPABASE_SERVICE_ROLE_KEY` admin client pattern already used in `tests/e2e/cohort-chat.spec.ts` — reuse that pattern, don't invent a new one.

---

### Task 1: Crop-math module + unit tests

**Files:**
- Create: `src/app/lib/imageCrop.ts`
- Test: `tests/unit/image-crop.test.ts`

**Interfaces:**
- Produces: `CropRect { x: number; y: number; width: number; height: number }`, `computeCropPixels(cropRect: CropRect, targetSize?: number): { source: CropRect; outputWidth: number; outputHeight: number }`, `cropImageToBlob(imageSrc: string, cropRect: CropRect, targetSize?: number): Promise<Blob>`.
- Consumes: nothing (leaf module).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/image-crop.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- image-crop`
Expected: FAIL — `Cannot find module '../../src/app/lib/imageCrop'` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/app/lib/imageCrop.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- image-crop`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/imageCrop.ts tests/unit/image-crop.test.ts
git commit -m "feat: add pure crop-math module for avatar cropping"
```

---

### Task 2: `AvatarCropModal` component

**Files:**
- Create: `src/app/components/ui/AvatarCropModal.tsx`
- Modify: `package.json` (add `react-easy-crop` dependency)

**Interfaces:**
- Consumes: `cropImageToBlob(imageSrc: string, cropRect: CropRect): Promise<Blob>` from `../../lib/imageCrop` (Task 1); `Button` from `./Button`; `Card` from `./Card`.
- Produces: `AvatarCropModal({ src: string, onCancel: () => void, onSave: (blob: Blob) => void })` — a default-exported-free named export, JSX component. No other task consumes it except Task 3 (`ProfileScreen.tsx`).

- [ ] **Step 1: Install the crop library**

Run: `npm install react-easy-crop`
Expected: `package.json` `dependencies` gains `"react-easy-crop": "^5.x.x"` (or current major), `package-lock.json` updated.

- [ ] **Step 2: Write the component**

Create `src/app/components/ui/AvatarCropModal.tsx`:

```tsx
import React, { useState } from 'react';
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

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await cropImageToBlob(src, croppedAreaPixels);
      onSave(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
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
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `AvatarCropModal.tsx` or `imageCrop.ts`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/components/ui/AvatarCropModal.tsx
git commit -m "feat: add AvatarCropModal component using react-easy-crop"
```

---

### Task 3: Wire the crop modal into `ProfileScreen.tsx`

**Files:**
- Modify: `src/components/profile/ProfileScreen.tsx:1-9` (imports), `:74-123` (state + `handleAvatarPick`), `:184-211` (identity Card JSX)

**Interfaces:**
- Consumes: `AvatarCropModal` from `../../app/components/ui/AvatarCropModal` (Task 2).
- Produces: nothing new consumed by later tasks — this is the integration point.

- [ ] **Step 1: Add the import**

In `src/components/profile/ProfileScreen.tsx`, after the existing `Toast` import (line 8), add:

```typescript
import { AvatarCropModal } from '../../app/components/ui/AvatarCropModal';
```

- [ ] **Step 2: Replace `handleAvatarPick` with `handleFilePick` + `handleCropSave`, and add `cropSrc` state**

Replace the state block (originally lines 76-78):

```typescript
  const [username, setUsername] = useState(user.username);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
```

with:

```typescript
  const [username, setUsername] = useState(user.username);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
```

Replace the entire `handleAvatarPick` function (originally lines 97-123) with:

```typescript
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { flash('error', 'Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { flash('error', 'Image must be under 5 MB.'); return; }

    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.onerror = () => flash('error', 'Could not read image.');
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setUploading(false); flash('error', 'Your session expired. Please sign in again.'); return; }

    const path = `${authUser.id}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (uploadError) { setUploading(false); flash('error', `Upload failed: ${uploadError.message}`); return; }

    const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    // Cache-bust so the new image replaces the old one at the same path.
    const bustedUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase.from('users').update({ profile_image_url: bustedUrl }).eq('id', authUser.id);
    setUploading(false);
    if (updateError) { flash('error', updateError.message); return; }

    onUserUpdate({ profile_image_url: bustedUrl });
    flash('success', 'Profile photo updated.');
  };
```

- [ ] **Step 3: Update the JSX**

In the identity `Card` block, change:

```tsx
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarPick} style={{ display: 'none' }} />
```

to:

```tsx
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: 'none' }} />
```

Then, immediately before the closing `</div>` of the component's root `<div style={{ padding: '32px 40px 64px', ... }}>` (i.e. right after the "Sign out" block, still inside the root div), add:

```tsx
      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onSave={handleCropSave}
        />
      )}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. (`handleAvatarPick` no longer exists anywhere — confirm with `grep -rn handleAvatarPick src/` returning no results.)

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/ProfileScreen.tsx
git commit -m "feat: wire avatar crop modal into profile photo upload"
```

---

### Task 4: E2e tests for crop → save and crop → cancel

**Files:**
- Create: `tests/e2e/fixtures/avatar-test.png`
- Create: `tests/e2e/avatar-crop.spec.ts`

**Interfaces:**
- Consumes: existing admin-client test-user pattern from `tests/e2e/cohort-chat.spec.ts` (service-role Supabase client, `resetUser`-style setup/teardown); app routes `/login` and `/dashboard`; the "Profile" sidenav button (`{ id: 'profile', label: 'Profile' }` in `src/app/pages/Dashboard.tsx`); the hidden file input rendered by `ProfileScreen.tsx` (`<input type="file" accept="image/*">`, currently unlabeled — locate via `page.locator('input[type="file"]')`); `AvatarCropModal`'s `role="dialog"` `aria-label="Crop profile photo"` and its `Cancel`/`Save` buttons (Task 2/3).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Create the fixture image**

Run:

```bash
mkdir -p tests/e2e/fixtures
node -e "require('fs').writeFileSync('tests/e2e/fixtures/avatar-test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'))"
```

Expected: `tests/e2e/fixtures/avatar-test.png` exists (a valid 1×1 PNG — sufficient to exercise the upload/crop pipeline; visual fidelity isn't under test here).

- [ ] **Step 2: Write the e2e test**

Create `tests/e2e/avatar-crop.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const admin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const USER = { email: 'avatar_crop_test@nixit.com', password: '12qwaszx', username: 'avatar_crop_tester' };
const FIXTURE = path.resolve(process.cwd(), 'tests/e2e/fixtures/avatar-test.png');

async function resetUser(): Promise<string> {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(entry => entry.email === USER.email);

  if (existing) {
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }

  const { data } = await admin.auth.admin.createUser({
    email: USER.email,
    password: USER.password,
    email_confirm: true,
  });

  return data.user!.id;
}

let userId: string;

test.beforeAll(async () => {
  userId = await resetUser();
  await admin.from('users').insert([{ id: userId, email: USER.email, username: USER.username, profile_image_url: null }]);
});

test.afterAll(async () => {
  await admin.from('users').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
});

test.describe('Avatar crop upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(USER.email);
    await page.getByLabel('Password').fill(USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('button', { name: 'Profile' }).click();
  });

  test('picking a photo opens the crop modal; Save uploads and updates the avatar', async ({ page }) => {
    const avatarImgBefore = page.locator('img[alt="avatar_crop_tester"]');
    await expect(avatarImgBefore).toHaveCount(0); // no photo yet → initials shown, no <img>

    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    const dialog = page.getByRole('dialog', { name: 'Crop profile photo' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page.getByText('Profile photo updated.')).toBeVisible();
    await expect(page.locator('img[alt="avatar_crop_tester"]')).toBeVisible();
  });

  test('Cancel closes the crop modal without uploading', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    const dialog = page.getByRole('dialog', { name: 'Crop profile photo' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page.getByText('Profile photo updated.')).toHaveCount(0);
    await expect(page.locator('img[alt="avatar_crop_tester"]')).toHaveCount(0);
  });
});
```

- [ ] **Step 3: Run the e2e tests**

Run: `npm run test:e2e -- avatar-crop`
Expected: PASS (2 tests). If the "Profile" button name or file-input locator doesn't match, inspect actual rendered markup with `npx playwright test avatar-crop --headed --debug` and adjust locators — do not change app behavior to fit the test.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/fixtures/avatar-test.png tests/e2e/avatar-crop.spec.ts
git commit -m "test: add e2e coverage for avatar crop save/cancel flows"
```

---

## Plan Self-Review

**Spec coverage:**
- Crop step between pick and upload → Task 1 + 2 + 3.
- Native camera capture (no extra button) → Task 3 Step 3 (input unchanged, no `capture` attr), documented in Global Constraints.
- Existing upload path unchanged downstream of the blob → Task 3 Step 2 (`handleCropSave` mirrors original `handleAvatarPick` body).
- Unit test for crop math → Task 1.
- E2e save + cancel coverage → Task 4.

**Placeholder scan:** none — every step has complete code and exact commands.

**Type consistency:** `CropRect`/`computeCropPixels`/`cropImageToBlob` signatures in Task 1 match the import in Task 2 (`Area` from `react-easy-crop` is structurally `{x,y,width,height}`, compatible with `CropRect`). `AvatarCropModal({ src, onCancel, onSave })` in Task 2 matches its usage in Task 3. `handleCropSave(blob: Blob)` matches `onSave: (blob: Blob) => void`.
