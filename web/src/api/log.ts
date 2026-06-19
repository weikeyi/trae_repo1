import request from '@/utils/request';
import type { ApiResponse, SlaRule, OperationLog, PaginatedResult } from '@/types';
import type { UrgencyLevel } from '@/types';

export interface LogQuery {
  page?: number;
  pageSize?: number;
  module?: string;
  action?: string;
  operatorId?: number;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
}

export interface SlaInput {
  urgency?: UrgencyLevel;
  responseMinutes?: number;
  resolutionMinutes?: number;
  escalationMinutes?: number;
  description?: string;
}

export const logApi = {
  list: (params?: LogQuery) =>
    request.get<any, ApiResponse<PaginatedResult<OperationLog>>>('/logs', { params }),

  exportCsv: (params?: { module?: string; dateFrom?: string; dateTo?: string }) =>
    request.get<any, any>('/logs/export', { params, responseType: 'blob' as any }),
};

export const slaApi = {
  list: () => request.get<any, ApiResponse<SlaRule[]>>('/sla'),

  create: (data: SlaInput) =>
    request.post<any, ApiResponse<SlaRule>>('/sla', data),

  update: (id: number, data: SlaInput) =>
    request.put<any, ApiResponse<SlaRule>>(`/sla/${id}`, data),

  delete: (id: number) => request.delete<any, ApiResponse>(`/sla/${id}`),
};

export const statsApi = {
  dashboard: () => request.get<any, ApiResponse<any>>('/stats/dashboard'),

  ticketTrend: (params?: { days?: number }) =>
    request.get<any, ApiResponse<any[]>>('/stats/ticket-trend', { params }),

  ticketsByStatus: () => request.get<any, ApiResponse<any[]>>('/stats/tickets-by-status'),

  ticketsByUrgency: () => request.get<any, ApiResponse<any[]>>('/stats/tickets-by-urgency'),

  storeStats: () => request.get<any, ApiResponse<any[]>>('/stats/store-stats'),

  technicianStats: () => request.get<any, ApiResponse<any[]>>('/stats/technician-stats'),

  inventoryAlert: () => request.get<any, ApiResponse<any[]>>('/stats/inventory-alert'),
};
