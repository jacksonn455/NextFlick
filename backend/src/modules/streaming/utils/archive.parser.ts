import { ArchiveFile, ArchiveText } from '../interfaces/archive.interface';

// archive.org identifiers: letters, digits, dot, dash and underscore
export const ARCHIVE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export function isValidIdentifier(identifier: string | undefined): boolean {
  return !!identifier && ARCHIVE_IDENTIFIER_PATTERN.test(identifier);
}

const MAX_DESCRIPTION_LENGTH = 600;

// First non-empty value of a field that can be a string or a list
export function toText(value: ArchiveText): string | null {
  const first = Array.isArray(value) ? value.find((v) => v?.trim()) : value;
  return first?.trim() || null;
}

// Descriptions are user-written HTML; keep plain text only
export function toPlainText(value: ArchiveText): string | null {
  const text = toText(value);
  if (!text) return null;

  const plain = text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) return null;
  return plain.length > MAX_DESCRIPTION_LENGTH
    ? `${plain.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`
    : plain;
}

export function parseYear(
  year: number | string | undefined,
  date: string | undefined,
): string | null {
  const match = String(year ?? date ?? '').match(/\d{4}/);
  return match ? match[0] : null;
}

// Formats browsers can play in a <video> tag, best first. "h.264 HD" and the
// originals are skipped: they are large and often not MP4.
const PLAYABLE_FORMATS = ['h.264', 'mpeg4', '512kb mpeg4', 'h.264 ia'];

export function pickVideoFile(
  files: ArchiveFile[] | undefined,
): ArchiveFile | null {
  if (!files?.length) return null;

  const mp4s = files.filter((file) => /\.mp4$/i.test(file.name));
  for (const format of PLAYABLE_FORMATS) {
    const match = mp4s.find((file) => file.format?.toLowerCase() === format);
    if (match) return match;
  }

  // Any other MP4 except HD versions
  return mp4s.find((file) => !/hd/i.test(file.format ?? '')) ?? null;
}

export function parseDuration(length: string | undefined): number | null {
  if (!length) return null;

  // Either seconds ("3117.52") or "HH:MM:SS"
  if (length.includes(':')) {
    const seconds = length
      .split(':')
      .map(Number)
      .reduce((total, part) => total * 60 + part, 0);
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
  }

  const seconds = Number(length);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
}

export const buildDownloadUrl = (
  baseUrl: string,
  identifier: string,
  fileName: string,
) =>
  `${baseUrl}/download/${identifier}/${fileName
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

export const buildThumbnailUrl = (baseUrl: string, identifier: string) =>
  `${baseUrl}/services/img/${identifier}`;

export const buildDetailsUrl = (baseUrl: string, identifier: string) =>
  `${baseUrl}/details/${identifier}`;

// Escapes characters with a meaning in the Lucene query syntax
export const escapeSearchTerm = (term: string) =>
  term
    .replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
