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
  subject?: ArchiveText;
  // Running time as written on the item ("01:23:45" or "83 min")
  runtime?: string;
  publicdate?: string;
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
    subject?: ArchiveText;
    runtime?: string;
    publicdate?: string;
  };
  files?: ArchiveFile[];
  is_dark?: boolean;
}

// What the API exposes to the frontend: the normalized model shared by all sources
export type {
  FreeMovie,
  FreeMovieDetails,
  LicenseInfo,
  LicenseType,
} from './free-movie.interface';
