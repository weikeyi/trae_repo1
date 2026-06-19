import { Request } from 'express';
import { config } from '../config';
import { PaginationParams, PaginatedResult } from '../types';

export const getPaginationParams = (req: Request): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string || String(config.pagination.defaultPage), 10));
  const pageSize = Math.min(
    config.pagination.maxPageSize,
    Math.max(1, parseInt(req.query.pageSize as string || String(config.pagination.defaultPageSize), 10))
  );
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
};

export const buildPaginatedResult = <T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> => {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};
