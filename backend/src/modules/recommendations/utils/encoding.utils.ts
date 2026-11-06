export const normalize = (value: number, min: number, max: number): number =>
  (value - min) / (max - min || 1);

export const validateNumbers = (
  values: (number | null | undefined)[],
): number[] =>
  values.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  );

export const getBounds = (values: number[]) => {
  if (values.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

export const validateStrings = (
  values: (string | null | undefined)[],
): string[] =>
  values.filter(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0,
  );

// tf.oneHot(index, length).mul(weight) with plain arrays:
// oneHot(1, 4, 0.1) -> [0, 0.1, 0, 0]
// An unknown value (index undefined) gives only zeros instead of failing
export const oneHot = (
  index: number | undefined,
  length: number,
  weight: number,
): number[] => Array.from({ length }, (_, i) => (i === index ? weight : 0));

// Like oneHot, for values that can have several categories (a movie's genres).
// The weight is split among the known indices, so a movie with 3 genres
// doesn't weigh more than a movie with 1:
// multiHot([0, 2], 4, 0.4) -> [0.2, 0, 0.2, 0]
export const multiHot = (
  indices: (number | undefined)[],
  length: number,
  weight: number,
): number[] => {
  const known = new Set(
    indices.filter(
      (index): index is number =>
        index !== undefined && index >= 0 && index < length,
    ),
  );
  const share = known.size ? weight / known.size : 0;

  return Array.from({ length }, (_, i) => (known.has(i) ? share : 0));
};

// tf.stack(vectors).mean(0) with plain arrays: the average of each position
// meanVector([[1, 2], [3, 4]]) -> [2, 3]
// Returns [] for no vectors; the caller decides the fallback (e.g. zeros)
export const meanVector = (vectors: number[][]): number[] => {
  if (!vectors.length) {
    return [];
  }

  return Array.from(
    { length: vectors[0].length },
    (_, i) =>
      vectors.reduce((sum, vector) => sum + vector[i], 0) / vectors.length,
  );
};
