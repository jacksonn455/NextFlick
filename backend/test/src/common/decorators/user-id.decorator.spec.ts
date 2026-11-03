import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_USER_ID,
  resolveUserId,
} from '../../../../src/common/decorators/user-id.decorator';

describe('resolveUserId', () => {
  it('should return the header value', () => {
    expect(resolveUserId('ana-lima')).toBe('ana-lima');
  });

  it('should trim the header value', () => {
    expect(resolveUserId('  bruno_01  ')).toBe('bruno_01');
  });

  it('should use the first value when the header is repeated', () => {
    expect(resolveUserId(['carla', 'diego'])).toBe('carla');
  });

  it('should fall back to the default user when the header is missing or empty', () => {
    expect(resolveUserId(undefined)).toBe(DEFAULT_USER_ID);
    expect(resolveUserId('   ')).toBe(DEFAULT_USER_ID);
  });

  it('should throw BadRequestException for invalid characters', () => {
    expect(() => resolveUserId('ana lima')).toThrow(BadRequestException);
    expect(() => resolveUserId('{"$ne":null}')).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when longer than 50 characters', () => {
    expect(() => resolveUserId('a'.repeat(51))).toThrow(BadRequestException);
  });
});
