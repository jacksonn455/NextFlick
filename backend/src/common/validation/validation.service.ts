import { Injectable } from '@nestjs/common';
import { BadRequestException } from '../exceptions/app.exceptions';

@Injectable()
export class ValidationService {
  validateRequiredString(
    value: string,
    fieldName: string,
    minLength: number = 1,
    maxLength: number = 100,
  ): void {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    if (value.trim().length < minLength) {
      throw new BadRequestException(
        `${fieldName} must be at least ${minLength} characters long`,
      );
    }

    if (value.length > maxLength) {
      throw new BadRequestException(`${fieldName} is too long`);
    }

    const invalidChars = /[<>{}]/;
    if (invalidChars.test(value)) {
      throw new BadRequestException(`${fieldName} contains invalid characters`);
    }
  }

  validateId(id: string, idName: string = 'ID'): void {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException(`${idName} cannot be empty`);
    }

    if (id.length < 2 || id.length > 50) {
      throw new BadRequestException(`Invalid ${idName} format`);
    }
  }

  validateSearchQuery(query: string): void {
    this.validateRequiredString(query, 'Search query', 2, 100);
  }

  validateImdbId(imdbID: string): void {
    if (!imdbID || !/^tt\d{7,10}$/.test(imdbID.trim())) {
      throw new BadRequestException('Invalid IMDb ID format');
    }
  }
}
