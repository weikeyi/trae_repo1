import request from '@/utils/request';
import type { ApiResponse, Store, PaginatedResult } from '@/types';

export interface StoreQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  region?: string;
  isActive?: boolean;
}

export interface StoreInput {
  storeCode?: string;
  name?: string;
  address?: string;
  region?: string;
  phone?: string;
  managerId?: number | null;
  isActive?: boolean;
}

export const storeApi = {
  list: (params?: StoreQuery) =>
    request.get<any, ApiResponse<PaginatedResult<Store>>>('/stores', { params }),

  get: (id: number) => request.get<any, ApiResponse<Store>>(`/stores/${id}`),

  create: (data: StoreInput) =>
    request.post<any, ApiResponse<Store>>('/stores', data),

  update: (id: number, data: StoreInput) =>
    request.put<any, ApiResponse<Store>>(`/stores/${id}`, data),

  delete: (id: number) => request.delete<any, ApiResponse>(`/stores/${id}`),
};
