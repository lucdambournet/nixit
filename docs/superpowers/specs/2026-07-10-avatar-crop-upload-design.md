# Avatar Photo Upload — Crop & Native Capture (Issue #61)

## Problem

`ProfileScreen.tsx` already lets a user pick an image file and upload it straight
to Supabase Storage (`avatars` bucket) as their avatar. There is no crop/reposition
step, and no explicit affordance for mobile users to use their camera. Issue #61
asks for: (1) easy upload, (2) a slick crop/edit experience via a third-party lib,
with native-feeling capture on mobile, (3) Playwright e2e + unit test coverage.

## Goals

- Insert a crop step between file-pick and upload, so the user controls framing
  before the image is saved.
- Support mobile "take a photo" via the OS's native picker, without adding a
  second button.
- Keep the existing upload/RPC path (Supabase storage upload + `users` table
  update) unchanged — only the blob fed into it changes.
- Cover the new code with a unit test (pure crop-math) and e2e tests (Playwright).

## Non-goals

- Rotate/flip/filters — out of scope, avatar crop only.
- Reusable app-wide `<Modal>` component — this builds a single-purpose overlay;
  extracting a generic modal is a separate concern.
- Changing the storage bucket. Avatars still live in the existing `avatars`
  bucket.

### Deviations from plan

While implementing, two changes originally scoped as non-goals turned out to
be necessary and were made deliberately, not by scope creep:

- **File naming scheme.** The avatar path changed from `${uid}.${ext}` to a
  fixed `${uid}.jpg`, because `cropImageToBlob` always produces a JPEG
  (512×512, quality 0.9) regardless of the source file's format — keeping the
  original extension would mismatch the actual content type and could leave
  stale files in other extensions behind. See
  `src/components/profile/ProfileScreen.tsx`, `handleCropSave`.
- **RLS policies.** A new `storage.objects` SELECT policy ("Anyone can view
  avatars") was added (`supabase/rls_policies.sql`, ~line 110). This was a
  pre-existing bug unrelated to the crop feature itself: uploads were
  completely broken in production because Supabase's storage API issues an
  internal `INSERT ... RETURNING`, which requires a SELECT policy to succeed
  — none existed before. It was discovered while validating this feature and
  fixed in the same branch since avatar uploads couldn't otherwise be
  end-to-end tested.

## Architecture

```
ProfileScreen.tsx
  ├─ <input type="file" accept="image/*" onChange={handleFilePick}>   (existing input, unchanged accept/no capture attr)
  │     → validates type/size (existing checks, unchanged)
  │     → FileReader → dataURL
  │     → setCropSrc(dataURL)  → opens <AvatarCropModal>
  │
  └─ <AvatarCropModal src={cropSrc} onCancel onSave={(blob) => handleAvatarUpload(blob)}>
        ├─ react-easy-crop <Cropper> (cropShape="round", aspect={1})
        ├─ zoom slider
        ├─ Cancel → onCancel() → closes modal, no upload, avatar untouched
        └─ Save → cropImageToBlob(src, croppedAreaPixels) → onSave(blob)
                    → handleAvatarUpload(blob) (existing Supabase upload logic,
                      now takes a Blob instead of the raw File)
```

`cropImageToBlob` lives in `src/app/lib/imageCrop.ts` and is split into two
pieces so the math is unit-testable without a real `<canvas>`:

- `computeCropPixels(croppedAreaPixels, targetSize = 512)` — pure function,
  returns the source rect `{x, y, width, height}` and output `{width, height}`
  to draw. No canvas/DOM dependency → unit testable in vitest/jsdom.
- `cropImageToBlob(imageSrc, croppedAreaPixels)` — impure, does the actual
  `<canvas>` draw + `toBlob(..., 'image/jpeg', 0.9)`, calling
  `computeCropPixels` internally. Exercised via e2e, not unit tests.

## Native capture

No `capture` attribute is added to the file input. Plain
`<input type="file" accept="image/*">` already triggers the OS-native
action sheet (Camera / Photo Library / Browse) on iOS Safari and Android
Chrome — using `capture="user"` would instead *skip* that chooser and force
the camera only, which is not what we want. One button, one input, native
behavior does the rest.

## Data flow

1. User clicks "Change Photo" → existing hidden `<input type="file">` fires.
2. `handleFilePick`: same validation as today (image mimetype, ≤5MB) → on
   pass, `FileReader.readAsDataURL(file)` → `setCropSrc(result)`.
3. `AvatarCropModal` opens (controlled by `cropSrc !== null`). User drags/pinches
   to reposition, zoom slider adjusts scale. `react-easy-crop`'s `onCropComplete`
   tracks `croppedAreaPixels` in local state.
4. Save → `cropImageToBlob(cropSrc, croppedAreaPixels)` resolves a JPEG Blob
   (512×512, quality 0.9) → modal closes → existing upload flow
   (`supabase.storage.from('avatars').upload(path, blob, {upsert: true})` →
   `getPublicUrl` → cache-bust → `users` table update → `onUserUpdate`) runs,
   same as it does today for a raw `File` (a `Blob` works identically with the
   Supabase upload call).
5. Cancel → `setCropSrc(null)`, nothing uploaded, no state changes.

## Error handling

| Case | Behavior |
|---|---|
| Non-image file picked | Existing check fires before modal opens: toast error, no modal. |
| File > 5MB | Existing check fires before modal opens: toast error, no modal. |
| `FileReader` fails | Toast error "Could not read image.", no modal opens. |
| User cancels crop | Modal closes, no upload, no toast. |
| Upload fails after crop | Existing error toast path (`Upload failed: …`), unchanged. |
| Auth session expired mid-flow | Existing check (`supabase.auth.getUser()` null) fires as today. |

## Testing strategy

**Unit** (`tests/unit/image-crop.test.ts`, vitest):
- `computeCropPixels` given a `croppedAreaPixels` rect and target size 512 →
  returns correct scaled source rect and fixed 512×512 output dims.
- Edge cases: already-square crop, very small crop area (upscale case),
  non-square crop area (should still normalize to 512×512 output).

**E2e** (`tests/e2e/avatar-crop.spec.ts`, Playwright):
- Upload fixture image via `setInputFiles` → assert crop modal appears
  (round crop preview visible, Save/Cancel buttons present).
- Click Save (default crop/zoom) → assert modal closes, avatar `src`
  changes, success toast appears.
- Second test: open modal, click Cancel → assert modal closes, avatar
  `src` unchanged from before upload, no toast.

## Dependencies

Add `react-easy-crop` (~10kb, no peer deps beyond React) to `package.json`.

## Open questions

None — resolved during brainstorming (single button/native picker,
react-easy-crop, modal overlay).
