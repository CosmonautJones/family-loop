import type { AuthSession, LoopedInService, ReminderPreference } from '../../services/api';
import type { Event, EventMessage, MediaItem, RSVP } from '../../types/domain';

const exportVersion = 1;
const encryptionIterations = 310_000;
const maximumMediaBytes = 1024 * 1024;
const defaultMediaRequestTimeoutMs = 15_000;

type ExportedEvent = Omit<Event, 'coverUri' | 'media'>;
type ExportedMessage = Pick<EventMessage, 'id' | 'eventId' | 'body' | 'authorName' | 'authorId' | 'self' | 'createdAt'>;
type ExportedMedia = Omit<MediaItem, 'uri'> & {
  file: { bytesBase64: string; byteLength: number; mediaType: string; sha256: string } | null;
};

export type UserDataExport = {
  format: 'loopedin-user-data';
  version: 1;
  createdAt: string;
  scope: 'current-account-contributions';
  account: { userId: string; displayName: string };
  memberships: { groupId: string; groupName: string; role: 'owner' | 'admin' | 'member' }[];
  createdEvents: ExportedEvent[];
  rsvps: RSVP[];
  messages: ExportedMessage[];
  media: ExportedMedia[];
  reminders: ReminderPreference[];
};

export type UserDataExportManifest = {
  format: 'loopedin-user-data-manifest';
  version: 1;
  createdAt: string;
  scope: UserDataExport['scope'];
  counts: {
    memberships: number;
    createdEvents: number;
    rsvps: number;
    messages: number;
    media: number;
    mediaFiles: number;
    unavailableMediaFiles: number;
    reminders: number;
  };
  dataSha256: string;
};

export type EncryptedUserDataExport = {
  format: 'loopedin-encrypted-user-export';
  version: 1;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; saltBase64: string };
  cipher: { name: 'AES-GCM'; ivBase64: string };
  ciphertextBase64: string;
  ciphertextSha256: string;
};

type PlaintextExport = { manifest: UserDataExportManifest; data: UserDataExport };

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}

function sortById<T extends { id?: string; eventId?: string }>(items: T[]) {
  return items.sort((left, right) => (left.id ?? left.eventId ?? '').localeCompare(right.id ?? right.eventId ?? ''));
}

async function readOwnedMedia(item: MediaItem, timeoutMs: number): Promise<ExportedMedia> {
  const { uri, ...metadata } = item;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(uri, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
    if (!response.ok) throw new Error('media unavailable');
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maximumMediaBytes) throw new Error('media too large');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('media unavailable');
    const chunks: Uint8Array[] = [];
    let byteLength = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maximumMediaBytes) {
        await reader.cancel();
        controller.abort();
        throw new Error('media too large');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return {
      ...metadata,
      file: {
        bytesBase64: bytesToBase64(bytes),
        byteLength: bytes.byteLength,
        mediaType: response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream',
        sha256: await sha256(bytes),
      },
    };
  } catch {
    return { ...metadata, file: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectCurrentUserData(
  service: LoopedInService,
  session: AuthSession,
  createdAt = new Date().toISOString(),
  options: { mediaRequestTimeoutMs?: number } = {},
): Promise<UserDataExport> {
  const groups = await service.groups.listGroups();
  const memberships: UserDataExport['memberships'] = [];
  const createdEvents: ExportedEvent[] = [];
  const rsvps: RSVP[] = [];
  const messages: ExportedMessage[] = [];
  const media: ExportedMedia[] = [];
  const reminders: ReminderPreference[] = [];

  for (const group of groups) {
    const members = await service.groups.listGroupMembers(group.id);
    const membership = members.find((member) => member.id === session.userId);
    if (!membership) continue;
    memberships.push({ groupId: group.id, groupName: group.name, role: membership.role });

    const events = await service.events.listEvents(group.id);
    for (const event of events) {
      if (event.creatorId === session.userId) {
        const { coverUri: _coverUri, media: _media, ...exportedEvent } = event;
        createdEvents.push(exportedEvent);
      }
      const [eventRsvps, eventMessages, eventMedia, reminder] = await Promise.all([
        service.rsvps.listRsvps(event.id),
        service.thread.listMessages(event.id),
        service.media.listMedia(event.id),
        service.reminders.getPreference(event.id),
      ]);
      rsvps.push(...eventRsvps.filter((item) => item.personId === session.userId));
      messages.push(...eventMessages.filter((item) => item.authorId === session.userId).map((item) => ({
        id: item.id,
        eventId: item.eventId,
        body: item.body,
        authorName: item.authorName,
        authorId: item.authorId,
        self: item.self,
        createdAt: item.createdAt,
      })));
      for (const item of eventMedia.filter((candidate) => candidate.uploadedBy === session.userId)) {
        media.push(await readOwnedMedia(item, options.mediaRequestTimeoutMs ?? defaultMediaRequestTimeoutMs));
      }
      if (reminder?.userId === session.userId) reminders.push(reminder);
    }
  }

  return {
    format: 'loopedin-user-data',
    version: exportVersion,
    createdAt,
    scope: 'current-account-contributions',
    account: { userId: session.userId, displayName: session.displayName },
    memberships: memberships.sort((left, right) => left.groupId.localeCompare(right.groupId)),
    createdEvents: sortById(createdEvents),
    rsvps: sortById(rsvps),
    messages: sortById(messages),
    media: sortById(media),
    reminders: sortById(reminders),
  };
}

export async function encryptUserDataExport(data: UserDataExport, passphrase: string): Promise<{ bundle: EncryptedUserDataExport; manifest: UserDataExportManifest }> {
  if (passphrase.length < 12) throw new Error('Use a passphrase with at least 12 characters.');
  const dataJson = JSON.stringify(data);
  const mediaFiles = data.media.filter((item) => item.file !== null).length;
  const manifest: UserDataExportManifest = {
    format: 'loopedin-user-data-manifest',
    version: exportVersion,
    createdAt: data.createdAt,
    scope: data.scope,
    counts: {
      memberships: data.memberships.length,
      createdEvents: data.createdEvents.length,
      rsvps: data.rsvps.length,
      messages: data.messages.length,
      media: data.media.length,
      mediaFiles,
      unavailableMediaFiles: data.media.length - mediaFiles,
      reminders: data.reminders.length,
    },
    dataSha256: await sha256(dataJson),
  };
  const plaintext = new TextEncoder().encode(JSON.stringify({ manifest, data } satisfies PlaintextExport));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: encryptionIterations, salt }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  return {
    manifest,
    bundle: {
      format: 'loopedin-encrypted-user-export',
      version: exportVersion,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: encryptionIterations, saltBase64: bytesToBase64(salt) },
      cipher: { name: 'AES-GCM', ivBase64: bytesToBase64(iv) },
      ciphertextBase64: bytesToBase64(ciphertext),
      ciphertextSha256: await sha256(ciphertext),
    },
  };
}

export async function verifyUserDataExportPlaintext(parsed: PlaintextExport) {
  if (parsed.manifest.format !== 'loopedin-user-data-manifest' || parsed.data.format !== 'loopedin-user-data'
    || parsed.manifest.version !== exportVersion || parsed.data.version !== exportVersion
    || parsed.manifest.scope !== parsed.data.scope || parsed.manifest.createdAt !== parsed.data.createdAt
    || parsed.manifest.dataSha256 !== await sha256(JSON.stringify(parsed.data))) {
    throw new Error('The decrypted export did not pass its integrity check.');
  }
  const mediaFiles = parsed.data.media.filter((item) => item.file !== null).length;
  const expectedCounts: UserDataExportManifest['counts'] = {
    memberships: parsed.data.memberships.length,
    createdEvents: parsed.data.createdEvents.length,
    rsvps: parsed.data.rsvps.length,
    messages: parsed.data.messages.length,
    media: parsed.data.media.length,
    mediaFiles,
    unavailableMediaFiles: parsed.data.media.length - mediaFiles,
    reminders: parsed.data.reminders.length,
  };
  if (JSON.stringify(parsed.manifest.counts) !== JSON.stringify(expectedCounts)) {
    throw new Error('The decrypted export did not pass its integrity check.');
  }
}

export async function decryptUserDataExport(bundle: EncryptedUserDataExport, passphrase: string): Promise<PlaintextExport> {
  if (bundle.format !== 'loopedin-encrypted-user-export' || bundle.version !== exportVersion
    || bundle.kdf.name !== 'PBKDF2' || bundle.kdf.hash !== 'SHA-256'
    || bundle.kdf.iterations !== encryptionIterations || bundle.cipher.name !== 'AES-GCM') {
    throw new Error('This LoopedIn export format is not supported.');
  }
  const ciphertext = base64ToBytes(bundle.ciphertextBase64);
  if (await sha256(ciphertext) !== bundle.ciphertextSha256) throw new Error('The encrypted export was changed or damaged.');
  try {
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: encryptionIterations, salt: base64ToBytes(bundle.kdf.saltBase64) }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(bundle.cipher.ivBase64) }, key, ciphertext);
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as PlaintextExport;
    await verifyUserDataExportPlaintext(parsed);
    return parsed;
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith('The decrypted export')) throw cause;
    throw new Error('The passphrase is incorrect or the export was changed or damaged.');
  }
}

export function downloadEncryptedUserDataExport(bundle: EncryptedUserDataExport, createdAt: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') throw new Error('Downloads are available in the web app.');
  const url = URL.createObjectURL(new Blob([JSON.stringify(bundle)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `loopedin-export-${createdAt.slice(0, 10)}.loopedin`;
  link.click();
  URL.revokeObjectURL(url);
}
