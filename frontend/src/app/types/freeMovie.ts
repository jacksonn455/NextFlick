// frontend/app/types/freeMovie.ts
// Public domain films streamed from the Internet Archive

export interface LicenseInfo {
  type: 'public-domain' | 'cc0' | 'cc-by' | 'cc-by-sa' | null;
  label: string;
  url: string | null;
  allowed: boolean;
}

export interface FreeMovie {
  identifier: string;
  title: string;
  year: string | null;
  description: string | null;
  creator: string | null;
  thumbnail: string;
  license: LicenseInfo;
}

export interface FreeMovieDetails extends FreeMovie {
  videoUrl: string;
  videoFormat: string;
  durationSeconds: number | null;
  sourceUrl: string;
  attribution: string;
  rights: string | null;
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

export const watchUrl = (identifier: string, play = false) =>
  `/watch/${encodeURIComponent(identifier)}${play ? '?play=1' : ''}`;
