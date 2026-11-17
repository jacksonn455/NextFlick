// frontend/app/types/freeMovie.ts
// Free films from the Internet Archive, the Library of Congress, PeerTube and YouTube

export type MovieSource = 'archive' | 'youtube' | 'peertube' | 'loc';
export type ContentType = 'feature' | 'short' | 'unknown';

export const SOURCE_LABELS: Record<MovieSource, string> = {
  archive: 'Internet Archive',
  loc: 'Library of Congress',
  peertube: 'PeerTube',
  youtube: 'YouTube',
};

// Short labels for card badges
export const SOURCE_SHORT_LABELS: Record<MovieSource, string> = {
  archive: 'Archive',
  loc: 'LoC',
  peertube: 'PeerTube',
  youtube: 'YouTube',
};

export interface LicenseInfo {
  type: string | null;
  label: string;
  url: string | null;
  // The license lets anyone show and share the film
  allowed: boolean;
}

export interface FreeMovie {
  // Internet Archive ids are bare; other sources are prefixed ("youtube:<id>")
  identifier: string;
  source: MovieSource;
  externalId: string;
  title: string;
  year: string | null;
  description: string | null;
  creator: string | null;
  thumbnail: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  genres: string[];
  contentType: ContentType;
  license: LicenseInfo;
  licenseVerified: boolean;
  // Explicitly offered for free viewing (false: only publicly accessible)
  freeToWatch: boolean;
  alsoAvailableOn?: { source: MovieSource; identifier: string }[];
}

export interface FreeMovieDetails extends FreeMovie {
  // Direct file for the <video> player (Internet Archive, Library of Congress)
  videoUrl: string | null;
  videoFormat: string | null;
  // Official embedded player (YouTube, PeerTube)
  embedUrl: string | null;
  sourceUrl: string;
  attribution: string;
  rights: string | null;
}

export interface FreeSourceStatus {
  source: MovieSource;
  label: string;
  enabled: boolean;
  available: boolean;
}

export interface FreeCatalogFilters {
  query?: string;
  source?: MovieSource;
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
  contentType?: ContentType;
  // Default true
  freeOnly?: boolean;
}

export interface FreeCatalogPage {
  movies: FreeMovie[];
  unavailableSources: MovieSource[];
}

export interface WatchHistoryEntry {
  _id: string;
  identifier: string;
  title: string;
  thumbnail?: string;
  // Seconds
  position: number;
  duration: number;
  completed: boolean;
  lastWatchedAt: string;
}

// 5400 -> "1h 30m", 754 -> "12m"
export const formatDuration = (seconds: number | null | undefined): string | null => {
  if (!seconds || seconds < 60) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

// 754 -> "12:34", 3723 -> "1:02:03"
export const formatTimestamp = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

// ":" is kept readable in the path: /watch/youtube:abc
export const watchUrl = (identifier: string, play = false) =>
  `/watch/${encodeURIComponent(identifier).replace(/%3A/gi, ':')}${play ? '?play=1' : ''}`;
