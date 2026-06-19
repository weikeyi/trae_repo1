import request from '@/utils/request';
import type { ApiResponse, RepairTicket, PaginatedResult, TicketStatus, UrgencyLevel } from '@/types';

export interface TicketQuery {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  urgency?: UrgencyLevel;
  storeId?: number;
  assignedToId?: number;
  equipmentId?: number;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateTicketInput {
  equipmentId: number;
  faultType: string;
  description: string;
  imageUrls?: string[];
  urgency: UrgencyLevel;
  expectedTime?: string;
}

export interface AssignTicketInput {
  technicianId: number;
  remark?: string;
}

export interface UpdateTicketStatusInput {
  status: TicketStatus;
  remark?: string;
  diagnosis?: string;
  repairResult?: string;
  rejectReason?: string;
}

export interface MergeTicketInput {
  targetTicketId: number;
  remark?: string;
}

export const ticketApi = {
  list: (params?: TicketQuery) =>
    request.get<any, ApiResponse<PaginatedResult<RepairTicket>>>('/tickets', { params }),

  get: (id: number) => request.get<any, ApiResponse<RepairTicket>>(`/tickets/${id}`),

  create: (data: CreateTicketInput) =>
    request.post<any, ApiResponse<RepairTicket>>('/tickets', data),

  assign: (id: number, data: AssignTicketInput) =>
    request.post<any, ApiResponse<RepairTicket>>(`/tickets/${id}/assign`, data),

  updateStatus: (id: number, data: UpdateTicketStatusInput) =>
    request.post<any, ApiResponse<RepairTicket>>(`/tickets/${id}/status`, data),

  reject: (id: number, data?: { remark?: string }) =>
    request.post<any, ApiResponse<RepairTicket>>(`/tickets/${id}/reject`, data),

  merge: (id: number, data: MergeTicketInput) =>
    request.post<any, ApiResponse<RepairTicket>>(`/tickets/${id}/merge`, data),

  recommendTechnicians: (params: { equipmentId: number; urgency?: string }) =>
    request.get<any, ApiResponse<any[]>>('/tickets/recommend-technicians', { params }),

  exportCsv: (params?: { status?: TicketStatus; dateFrom?: string; dateTo?: string }) =>
    request.get<any, any>('/tickets/export', { params, responseType: 'blob' as any }),
};
