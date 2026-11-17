// Raw shapes returned by the YouTube Data API v3 (only the fields we use)

export interface YoutubeSearchResponse {
  items?: { id?: { videoId?: string } }[];
}

interface YoutubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface YoutubeVideo {
  id: string;
  snippet: {
    title: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    tags?: string[];
    liveBroadcastContent?: 'none' | 'live' | 'upcoming';
    thumbnails?: Partial<
      Record<
        'default' | 'medium' | 'high' | 'standard' | 'maxres',
        YoutubeThumbnail
      >
    >;
  };
  contentDetails?: {
    // ISO 8601, e.g. "PT1H32M10S"
    duration?: string;
    regionRestriction?: { allowed?: string[]; blocked?: string[] };
    contentRating?: { ytRating?: string };
  };
  status?: {
    uploadStatus?: string;
    privacyStatus?: 'public' | 'unlisted' | 'private';
    license?: 'youtube' | 'creativeCommon';
    embeddable?: boolean;
  };
}

export interface YoutubeVideosResponse {
  items?: YoutubeVideo[];
}
