import type { MediaUploadPayload } from './api';

export const maxBrowserImageBytes = 5 * 1024 * 1024;

export function validateMediaUpload(payload: MediaUploadPayload) {
  if (!payload.eventId.trim()) throw new Error('Choose a trip before sharing a photo.');
  if (!payload.altText.trim()) throw new Error('Describe the photo for family members who cannot see it.');
  if (!payload.fileUri.trim()) throw new Error('Choose a photo before sharing.');
  if (payload.fileUri.startsWith('data:')) {
    const match = /^data:image\/(jpeg|png|webp);base64,([a-z\d+/=\s]+)$/i.exec(payload.fileUri);
    if (!match) throw new Error('Choose a JPEG, PNG, or WebP image.');
    const encoded = match[2].replace(/\s/g, '');
    const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
    if (Math.floor(encoded.length * 3 / 4) - padding > maxBrowserImageBytes) {
      throw new Error('Choose an image no larger than 5 MB.');
    }
  } else {
    let url: URL;
    try { url = new URL(payload.fileUri); } catch { throw new Error('Choose a valid photo URL.'); }
    if (url.protocol !== 'https:') throw new Error('Photo URLs must use HTTPS.');
    if (!payload.sourceUrl?.trim() || !payload.creatorName?.trim()) {
      throw new Error('Remote photos require a source link and creator name.');
    }
  }
}
