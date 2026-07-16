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

/**
 * Safely extract a single string from Express route params.
 * In @types/express v5, req.params[key] is typed as string | string[].
 * This helper normalises it to a plain string.
 */
export function paramString(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parse and clamp pagination from query params.
 * Enforces a max limit to prevent unbounded queries (DoS protection).
 *
 * Usage: const { page, limit, skip } = parsePagination(req.query);
 */
const MAX_PAGE_LIMIT = 100;

export function parsePagination(query: Record<string, unknown>): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, queryNumber(query.page) ?? 1);
  const rawLimit = queryNumber(query.limit) ?? 20;
  const limit = Math.min(Math.max(1, rawLimit), MAX_PAGE_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
