import { BadRequestException } from '@nestjs/common';
import { resolveUserId } from '../../../../src/common/decorators/user-id.decorator';

const validId = '6728f0c2a1b2c3d4e5f60718';

describe('resolveUserId', () => {
  it('should return a valid user id', () => {
    expect(resolveUserId(validId)).toBe(validId);
  });

  it('should trim the header value', () => {
    expect(resolveUserId(`  ${validId}  `)).toBe(validId);
  });

  it('should use the first value when the header is repeated', () => {
    expect(resolveUserId([validId, '6728f0c2a1b2c3d4e5f60719'])).toBe(validId);
  });

  it('should throw BadRequestException when the header is missing or empty', () => {
    expect(() => resolveUserId(undefined)).toThrow(BadRequestException);
    expect(() => resolveUserId('   ')).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when the value is not a user id', () => {
    expect(() => resolveUserId('ana-lima')).toThrow(BadRequestException);
    expect(() => resolveUserId('{"$ne":null}')).toThrow(BadRequestException);
    expect(() => resolveUserId(`${validId}0`)).toThrow(BadRequestException);
  });
});
