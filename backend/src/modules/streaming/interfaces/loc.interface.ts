// Raw shapes returned by the loc.gov JSON API (only the fields we use)

export interface LocResource {
  // MP4 viewing copy
  video?: string;
  // Protocol-relative still ("//tile.loc.gov/...jpg")
  poster?: string;
  // Seconds
  duration?: number;
  download_restricted?: boolean;
  url?: string;
}

export interface LocSearchResult {
  id: string;
  url?: string;
  title?: string;
  date?: string;
  description?: string[];
  image_url?: string[];
  subject?: string[];
  contributor?: string[];
  access_restricted?: boolean;
  online_format?: string[];
  resources?: LocResource[];
}

export interface LocSearchResponse {
  results?: LocSearchResult[];
}

export interface LocItemResponse {
  item?: {
    id?: string;
    url?: string;
    title?: string;
    date?: string;
    description?: string[];
    summary?: string[];
    contributor_names?: string[];
    subject_headings?: string[];
    genre?: string[];
    access_restricted?: boolean;
    image_url?: string[];
  };
  resources?: LocResource[];
}
