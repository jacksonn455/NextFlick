import { MovieSource } from '../interfaces/free-movie.interface';
import { isValidIdentifier } from './archive.parser';

// "youtube:<id>", "peertube:<host>:<uuid>", "loc:<id>". Internet Archive identifiers
// never contain ":", so bare ids stay unambiguous and old links keep working.
const PREFIXED_ID =
  /^(youtube|peertube|loc):([A-Za-z0-9][A-Za-z0-9._:~-]{0,199})$/;

export interface ParsedMovieId {
  source: MovieSource;
  externalId: string;
}

export function parseMovieId(
  identifier: string | undefined,
): ParsedMovieId | null {
  if (!identifier) return null;

  const match = PREFIXED_ID.exec(identifier);
  if (match) {
    return { source: match[1] as MovieSource, externalId: match[2] };
  }

  return isValidIdentifier(identifier)
    ? { source: 'archive', externalId: identifier }
    : null;
}

export const isValidMovieId = (identifier: string | undefined) =>
  parseMovieId(identifier) !== null;

export const buildMovieId = (source: MovieSource, externalId: string) =>
  source === 'archive' ? externalId : `${source}:${externalId}`;
