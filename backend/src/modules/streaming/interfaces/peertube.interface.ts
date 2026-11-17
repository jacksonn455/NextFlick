// Raw shapes returned by the PeerTube REST API (only the fields we use).
// SepiaSearch returns the same shape plus absolute URLs.

interface IdLabel<T = number> {
  id: T;
  label?: string;
}

export interface PeerTubeVideo {
  uuid: string;
  shortUUID?: string;
  name: string;
  description?: string | null;
  // Seconds
  duration?: number;
  publishedAt?: string;
  originallyPublishedAt?: string | null;
  category?: IdLabel | null;
  licence?: IdLabel | null;
  privacy?: IdLabel;
  state?: IdLabel;
  nsfw?: boolean;
  isLive?: boolean;
  tags?: string[];
  thumbnailPath?: string;
  thumbnailUrl?: string;
  previewPath?: string;
  previewUrl?: string;
  thumbnails?: { width?: number; aspectRatio?: string; fileUrl: string }[];
  embedPath?: string;
  url?: string;
  account?: { displayName?: string; host?: string };
  channel?: { displayName?: string; host?: string };
}

export interface PeerTubeSearchResponse {
  total?: number;
  data?: PeerTubeVideo[];
}
