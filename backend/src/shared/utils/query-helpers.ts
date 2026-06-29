/**
 * Safely extract a single string from Express query params.
 * Express query params can be string | string[] | undefined.
 */
export function queryString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/**
 * Safely extract a number from Express query params.
 */
export function queryNumber(value: unknown): number | undefined {
  const str = queryString(value);
  if (str === undefined) return undefined;
  const num = Number(str);
  return isNaN(num) ? undefined : num;
}
