import { PaginationQuery } from '../types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface PrismaPageParams {
  skip: number;
  take: number;
}

/**
 * Parse and validate pagination parameters from query string
 */
export function parsePagination(query: Partial<PaginationQuery>): {
  page: number;
  limit: number;
  skip: number;
  take: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  let page = Number(query.page) || DEFAULT_PAGE;
  let limit = Number(query.limit) || DEFAULT_LIMIT;

  if (page < 1) page = DEFAULT_PAGE;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  return { page, limit, skip, take: limit, sortBy, sortOrder };
}

/**
 * Build pagination metadata for response
 */
export function buildPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
