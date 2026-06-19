import request from '@/utils/request';
import type { ApiResponse, Equipment, PaginatedResult } from '@/types';

export interface EquipmentQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  storeId?: number;
  category?: string;
  status?: string;
}

export interface EquipmentInput {
  equipmentCode?: string;
  name?: string;
  model?: string;
  category?: string;
  storeId?: number;
  purchaseDate?: string;
  lastMaintenanceDate?: string;
  status?: string;
  description?: string;
}

export const equipmentApi = {
  list: (params?: EquipmentQuery) =>
    request.get<any, ApiResponse<PaginatedResult<Equipment>>>('/equipments', { params }),

  get: (id: number) => request.get<any, ApiResponse<Equipment>>(`/equipments/${id}`),

  create: (data: EquipmentInput) =>
    request.post<any, ApiResponse<Equipment>>('/equipments', data),

  update: (id: number, data: EquipmentInput) =>
    request.put<any, ApiResponse<Equipment>>(`/equipments/${id}`, data),

  delete: (id: number) => request.delete<any, ApiResponse>(`/equipments/${id}`),
};
