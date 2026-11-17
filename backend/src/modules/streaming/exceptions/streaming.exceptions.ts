import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '../../../common/exceptions/app.exceptions';

export class InvalidArchiveIdentifierException extends BadRequestException {
  constructor(message: string = 'Invalid Internet Archive identifier') {
    super(message, 'INVALID_ARCHIVE_IDENTIFIER');
  }
}

export class FreeMovieNotFoundException extends NotFoundException {
  constructor(message: string = 'Free movie not found') {
    super(message, 'FREE_MOVIE_NOT_FOUND');
  }
}

export class VideoUnavailableException extends NotFoundException {
  constructor(message: string = 'No playable video file for this movie') {
    super(message, 'VIDEO_UNAVAILABLE');
  }
}

export class LicenseNotAllowedException extends ForbiddenException {
  constructor(
    message: string = 'This movie is not public domain or openly licensed',
  ) {
    super(message, 'LICENSE_NOT_ALLOWED');
  }
}

export class ArchiveUnavailableException extends ServiceUnavailableException {
  constructor(message: string = 'The Internet Archive is unavailable') {
    super(message, 'ARCHIVE_UNAVAILABLE');
  }
}

export class WatchHistoryNotFoundException extends NotFoundException {
  constructor(message: string = 'Watch history entry not found') {
    super(message, 'WATCH_HISTORY_NOT_FOUND');
  }
}

export class InvalidMovieIdentifierException extends BadRequestException {
  constructor(message: string = 'Invalid movie identifier') {
    super(message, 'INVALID_MOVIE_IDENTIFIER');
  }
}

// A content source (YouTube, PeerTube, Library of Congress) failed or timed out.
// retryAfterMs tells the catalog how long to skip the source (e.g. quota exhausted).
export class ProviderUnavailableException extends ServiceUnavailableException {
  constructor(
    readonly source: string,
    message: string = `${source} is unavailable`,
    readonly retryAfterMs?: number,
  ) {
    super(message, 'PROVIDER_UNAVAILABLE');
  }
}

export class CatalogUnavailableException extends ServiceUnavailableException {
  constructor(message: string = 'Free movie sources are unavailable') {
    super(message, 'CATALOG_UNAVAILABLE');
  }
}
