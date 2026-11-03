import {
  NotFoundException,
  UnauthorizedException,
  ServiceUnavailableException,
  BadRequestException,
} from '../../../common/exceptions/app.exceptions';

export class MovieNotFoundException extends NotFoundException {
  constructor(message: string = 'Movie not found') {
    super(message, 'MOVIE_NOT_FOUND');
  }
}

export class InvalidApiKeyException extends UnauthorizedException {
  constructor(message: string = 'Invalid API key') {
    super(message, 'INVALID_API_KEY');
  }
}

export class MovieServiceUnavailableException extends ServiceUnavailableException {
  constructor(message: string = 'Movie service is unavailable') {
    super(message, 'MOVIE_SERVICE_UNAVAILABLE');
  }
}

export class InvalidMovieDataException extends BadRequestException {
  constructor(message: string = 'Invalid movie data') {
    super(message, 'INVALID_MOVIE_DATA');
  }
}
