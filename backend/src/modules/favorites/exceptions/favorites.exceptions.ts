import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '../../../common/exceptions/app.exceptions';

export class FavoriteNotFoundException extends NotFoundException {
  constructor(message: string = 'Favorite not found') {
    super(message, 'FAVORITE_NOT_FOUND');
  }
}

export class FavoriteAlreadyExistsException extends ConflictException {
  constructor(message: string = 'Movie already in favorites') {
    super(message, 'FAVORITE_ALREADY_EXISTS');
  }
}

export class InvalidFavoriteDataException extends BadRequestException {
  constructor(message: string = 'Invalid favorite data') {
    super(message, 'INVALID_FAVORITE_DATA');
  }
}

export class FavoriteLimitExceededException extends BadRequestException {
  constructor(message: string = 'Favorite limit exceeded') {
    super(message, 'FAVORITE_LIMIT_EXCEEDED');
  }
}
