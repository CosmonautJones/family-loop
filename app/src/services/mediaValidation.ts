import type { MediaUploadPayload } from './api';

export const maxBrowserImageBytes = 1024 * 1024;

function requireHttpsUrl(value: string, label: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label} must be a valid HTTPS link.`); }
  if (url.protocol !== 'https:') throw new Error(`${label} must be a valid HTTPS link.`);
  return url;
}

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
      throw new Error('Choose an image no larger than 1 MB.');
    }
  } else {
    requireHttpsUrl(payload.fileUri, 'Photo URL');
    if (!payload.sourceName?.trim() || !payload.sourceUrl?.trim() || !payload.creatorName?.trim()) {
      throw new Error('Remote photos require a source name, source link, and creator name.');
    }
  }
  const hasSource = Boolean(payload.sourceName?.trim() || payload.sourceUrl?.trim());
  const hasCreator = Boolean(payload.creatorName?.trim() || payload.creatorUrl?.trim());
  if (hasSource !== hasCreator || (hasSource && (!payload.sourceName?.trim() || !payload.sourceUrl?.trim() || !payload.creatorName?.trim()))) {
    throw new Error('Provide the source name, source link, and creator name together, or leave all attribution blank.');
  }
  if (hasSource) {
    const sourceUrl = requireHttpsUrl(payload.sourceUrl!, 'Source link');
    if (payload.creatorUrl?.trim()) requireHttpsUrl(payload.creatorUrl, 'Creator link');
    if (payload.sourceName!.trim().toLowerCase() === 'unsplash' && !/^(www\.)?unsplash\.com$/i.test(sourceUrl.hostname)) {
      throw new Error('Unsplash attribution must link to unsplash.com.');
    }
  }
}
