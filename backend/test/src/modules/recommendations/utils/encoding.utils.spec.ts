import {
  getBounds,
  meanVector,
  multiHot,
  normalize,
  oneHot,
  validateNumbers,
  validateStrings,
} from '../../../../../src/modules/recommendations/utils/encoding.utils';

describe('encoding utils', () => {
  describe('normalize', () => {
    it('should map the range to [0, 1]', () => {
      expect(normalize(5, 0, 10)).toBe(0.5);
      expect(normalize(0, 0, 10)).toBe(0);
      expect(normalize(10, 0, 10)).toBe(1);
    });

    it('should work with ranges that do not start at 0', () => {
      expect(normalize(129.99, 89.99, 199.99)).toBeCloseTo(0.3636);
    });

    it('should not divide by zero when min equals max', () => {
      expect(normalize(7, 7, 7)).toBe(0);
    });
  });

  describe('validateNumbers', () => {
    it('should keep only finite numbers', () => {
      expect(
        validateNumbers([7.5, null, 8, undefined, NaN, Infinity, 0]),
      ).toEqual([7.5, 8, 0]);
    });
  });

  describe('getBounds', () => {
    it('should return the smallest and largest values', () => {
      expect(getBounds([8.1, 6.5, 9.3])).toEqual({ min: 6.5, max: 9.3 });
    });

    it('should return 0 and 0 for no values', () => {
      expect(getBounds([])).toEqual({ min: 0, max: 0 });
    });
  });

  describe('validateStrings', () => {
    it('should keep only non-blank strings', () => {
      expect(
        validateStrings(['PG-13', null, '', '   ', undefined, 'R']),
      ).toEqual(['PG-13', 'R']);
    });
  });

  describe('oneHot', () => {
    it('should put the weight at the index and zeros elsewhere', () => {
      expect(oneHot(1, 4, 0.1)).toEqual([0, 0.1, 0, 0]);
      expect(oneHot(0, 2, 0.1)).toEqual([0.1, 0]);
    });

    it('should return only zeros for an unknown value', () => {
      expect(oneHot(undefined, 3, 0.1)).toEqual([0, 0, 0]);
    });

    it('should return only zeros for an index out of range', () => {
      expect(oneHot(5, 3, 0.1)).toEqual([0, 0, 0]);
    });
  });

  describe('multiHot', () => {
    it('should split the weight among the indices', () => {
      expect(multiHot([0, 2], 4, 0.4)).toEqual([0.2, 0, 0.2, 0]);
    });

    it('should give the whole weight to a single index', () => {
      expect(multiHot([1], 3, 0.4)).toEqual([0, 0.4, 0]);
    });

    it('should ignore unknown and out of range indices', () => {
      expect(multiHot([1, undefined, 9], 3, 0.4)).toEqual([0, 0.4, 0]);
    });

    it('should count a repeated index once', () => {
      expect(multiHot([2, 2], 3, 0.4)).toEqual([0, 0, 0.4]);
    });

    it('should return only zeros when no index is known', () => {
      expect(multiHot([], 3, 0.4)).toEqual([0, 0, 0]);
      expect(multiHot([undefined], 3, 0.4)).toEqual([0, 0, 0]);
    });

    it('should keep the total weight the same for any number of genres', () => {
      const total = (vector: number[]) => vector.reduce((a, b) => a + b, 0);

      expect(total(multiHot([0], 5, 0.4))).toBeCloseTo(0.4);
      expect(total(multiHot([0, 1, 2], 5, 0.4))).toBeCloseTo(0.4);
    });
  });

  describe('meanVector', () => {
    it('should average each position', () => {
      expect(
        meanVector([
          [1, 2],
          [3, 4],
        ]),
      ).toEqual([2, 3]);
    });

    it('should handle decimals', () => {
      const result = meanVector([
        [0.2, 0],
        [0, 0.4],
      ]);

      expect(result[0]).toBeCloseTo(0.1);
      expect(result[1]).toBeCloseTo(0.2);
    });

    it('should return a copy of a single vector', () => {
      const vector = [0.1, 0.2, 0.3];
      const result = meanVector([vector]);

      expect(result).toEqual(vector);
      expect(result).not.toBe(vector);
    });

    it('should return an empty array for no vectors', () => {
      expect(meanVector([])).toEqual([]);
    });
  });
});
