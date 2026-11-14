// Raw shapes returned by the Internet Archive APIs (only the fields we use)

// Text fields can be a string or a list of strings, depending on the item
export type ArchiveText = string | string[] | undefined;

export interface ArchiveSearchDoc {
  identifier: string;
  title?: ArchiveText;
  year?: number | string;
  date?: string;
  description?: ArchiveText;
  creator?: ArchiveText;
  licenseurl?: string;
}

export interface ArchiveSearchResponse {
  response?: {
    numFound: number;
    docs: ArchiveSearchDoc[];
  };
  error?: string;
}

export interface ArchiveFile {
  name: string;
  format?: string;
  source?: string;
  // Duration in seconds, as a string ("3117.52")
  length?: string;
  size?: string;
}

export interface ArchiveMetadataResponse {
  // Missing when the item does not exist or was taken down ("dark")
  metadata?: {
    identifier: string;
    title?: ArchiveText;
    year?: string;
    date?: string;
    description?: ArchiveText;
    creator?: ArchiveText;
    licenseurl?: string;
    rights?: ArchiveText;
    mediatype?: string;
  };
  files?: ArchiveFile[];
  is_dark?: boolean;
}

// What the API exposes to the frontend

export type LicenseType = 'public-domain' | 'cc0' | 'cc-by' | 'cc-by-sa';

export interface LicenseInfo {
  type: LicenseType | null;
  label: string;
  url: string | null;
  // True only for licenses that allow streaming the film in this app
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
