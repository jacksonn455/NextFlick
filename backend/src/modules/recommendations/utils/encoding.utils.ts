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
