import request from '@/utils/request';
import type { ApiResponse, User, PaginatedResult, Role } from '@/types';

export interface UserQuery {
  page?: number;
  pageSize?: number;
  role?: Role;
  keyword?: string;
  isActive?: boolean;
}

export interface CreateUserInput {
  username: string;
  password: string;
  realName: string;
  phone?: string;
  email?: string;
  role: Role;
  storeId?: number;
  skills?: string[];
  regions?: string[];
  maxLoad?: number;
}

export interface UpdateUserInput {
  realName?: string;
  phone?: string;
  email?: string;
  role?: Role;
  storeId?: number | null;
  isActive?: boolean;
  password?: string;
  skills?: string[];
  regions?: string[];
  maxLoad?: number;
}

export const userApi = {
  getCurrent: () => request.get<any, ApiResponse<User>>('/users/me'),

  list: (params?: UserQuery) =>
    request.get<any, ApiResponse<PaginatedResult<User>>>('/users', { params }),

  listTechnicians: (params?: { region?: string }) =>
    request.get<any, ApiResponse<User[]>>('/users/technicians', { params }),

  get: (id: number) => request.get<any, ApiResponse<User>>(`/users/${id}`),

  create: (data: CreateUserInput) =>
    request.post<any, ApiResponse<User>>('/users', data),

  update: (id: number, data: UpdateUserInput) =>
    request.put<any, ApiResponse<User>>(`/users/${id}`, data),

  delete: (id: number) => request.delete<any, ApiResponse>(`/users/${id}`),
};
