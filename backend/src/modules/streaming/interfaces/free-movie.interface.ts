// Normalized free movie model shared by every content source (Internet Archive,
// YouTube, PeerTube, Library of Congress) and the contract each source implements.

export type MovieSource = 'archive' | 'youtube' | 'peertube' | 'loc';

export const MOVIE_SOURCES: MovieSource[] = [
  'archive',
  'loc',
  'peertube',
  'youtube',
];

export const SOURCE_LABELS: Record<MovieSource, string> = {
  archive: 'Internet Archive',
  youtube: 'YouTube',
  peertube: 'PeerTube',
  loc: 'Library of Congress',
};

// feature: 40+ minutes, short: under 40 minutes, unknown: no duration available
export type ContentType = 'feature' | 'short' | 'unknown';

export type LicenseType =
  | 'public-domain'
  | 'cc0'
  | 'cc-by'
  | 'cc-by-sa'
  | 'cc-by-nd'
  | 'cc-by-nc'
  | 'cc-by-nc-sa'
  | 'cc-by-nc-nd'
  // Library of Congress: "not aware of any U.S. copyright or other restrictions"
  | 'no-known-restrictions';

export interface LicenseInfo {
  type: LicenseType | null;
  label: string;
  url: string | null;
  // True only for licenses that allow anyone to show and share the film
  allowed: boolean;
}

export interface SourceRef {
  source: MovieSource;
  identifier: string;
}

export interface FreeMovie {
  // Unique id in the app: Internet Archive identifiers stay bare (backward compatible),
  // other sources are prefixed ("youtube:dQw4w9WgXcQ")
  identifier: string;
  source: MovieSource;
  // Id of the item at the source, kept for future synchronization
  externalId: string;
  title: string;
  year: string | null;
  description: string | null;
  creator: string | null;
  thumbnail: string;
  durationSeconds: number | null;
  // When the source published the item (not the release year)
  publishedAt: string | null;
  genres: string[];
  contentType: ContentType;
  license: LicenseInfo;
  // The license comes from structured source metadata, not from guessing
  licenseVerified: boolean;
  // The rights holder or the source explicitly offers the film for free viewing.
  // False means the item is only publicly accessible.
  freeToWatch: boolean;
  // Same film found on other sources (filled by the catalog deduplication)
  alsoAvailableOn?: SourceRef[];
}

export interface FreeMovieDetails extends FreeMovie {
  // Direct video file played in a <video> tag (Internet Archive, Library of Congress)
  videoUrl: string | null;
  videoFormat: string | null;
  // Official embedded player (YouTube, PeerTube)
  embedUrl: string | null;
  sourceUrl: string;
  attribution: string;
  rights: string | null;
}

export interface ProviderSearchOptions {
  query?: string;
  genre?: string;
  limit?: number;
  page?: number;
  // When false, sources may also return publicly accessible items without a verified license
  freeOnly?: boolean;
}

// Contract implemented by every content source
export interface FreeMovieProvider {
  readonly source: MovieSource;
  // False when required credentials are missing; the catalog then skips the source
  isEnabled(): boolean;
  search(options?: ProviderSearchOptions): Promise<FreeMovie[]>;
  // Receives the source's own id (without the "source:" prefix)
  getMovie(externalId: string): Promise<FreeMovieDetails>;
}
