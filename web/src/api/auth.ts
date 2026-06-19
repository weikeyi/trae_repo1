import request from '@/utils/request';
import type { ApiResponse, User, PaginatedResult } from '@/types';

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request.post<any, ApiResponse<{ token: string; user: User }>>('/auth/login', data),
};
