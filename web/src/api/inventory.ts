import request from '@/utils/request';
import type {
  ApiResponse,
  SparePart,
  Inventory,
  SparePartRequest,
  Transfer,
  PaginatedResult,
  SparePartRequestStatus,
  TransferStatus,
} from '@/types';

export interface SparePartQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
}

export interface InventoryQuery {
  page?: number;
  pageSize?: number;
  storeId?: number;
  sparePartId?: number;
  keyword?: string;
  lowStock?: boolean;
}

export interface SparePartRequestQuery {
  page?: number;
  pageSize?: number;
  status?: SparePartRequestStatus;
  ticketId?: number;
  fromStoreId?: number;
  toStoreId?: number;
}

export interface TransferQuery {
  page?: number;
  pageSize?: number;
  status?: TransferStatus;
  fromStoreId?: number;
  toStoreId?: number;
  requestId?: number;
}

export interface SparePartInput {
  partCode?: string;
  name?: string;
  category?: string;
  unit?: string;
  description?: string;
}

export interface InventoryInput {
  quantity?: number;
  minStock?: number;
}

export interface CreateSparePartRequestInput {
  ticketId: number;
  sparePartId: number;
  requestQty: number;
  fromStoreId?: number;
  remark?: string;
}

export interface UpdateSparePartRequestInput {
  status: SparePartRequestStatus;
  remark?: string;
  fulfilledQty?: number;
}

export interface CreateTransferInput {
  requestId: number;
  sparePartId: number;
  fromStoreId: number;
  toStoreId: number;
  quantity: number;
  remark?: string;
}

export interface UpdateTransferInput {
  status: TransferStatus;
  remark?: string;
}

export const sparePartApi = {
  list: (params?: SparePartQuery) =>
    request.get<any, ApiResponse<PaginatedResult<SparePart>>>('/spare-parts', { params }),

  get: (id: number) => request.get<any, ApiResponse<SparePart>>(`/spare-parts/${id}`),

  create: (data: SparePartInput) =>
    request.post<any, ApiResponse<SparePart>>('/spare-parts', data),

  update: (id: number, data: SparePartInput) =>
    request.put<any, ApiResponse<SparePart>>(`/spare-parts/${id}`, data),

  delete: (id: number) => request.delete<any, ApiResponse>(`/spare-parts/${id}`),
};

export const inventoryApi = {
  list: (params?: InventoryQuery) =>
    request.get<any, ApiResponse<PaginatedResult<Inventory>>>('/inventories', { params }),

  get: (id: number) => request.get<any, ApiResponse<Inventory>>(`/inventories/${id}`),

  update: (id: number, data: InventoryInput) =>
    request.put<any, ApiResponse<Inventory>>(`/inventories/${id}`, data),

  checkAvailability: (params: { sparePartId: number; quantity: number; storeId?: number }) =>
    request.get<any, ApiResponse<any>>('/inventories/check-availability', { params }),

  listRequests: (params?: SparePartRequestQuery) =>
    request.get<any, ApiResponse<PaginatedResult<SparePartRequest>>>('/inventories/requests', { params }),

  getRequest: (id: number) =>
    request.get<any, ApiResponse<SparePartRequest>>(`/inventories/requests/${id}`),

  createRequest: (data: CreateSparePartRequestInput) =>
    request.post<any, ApiResponse<SparePartRequest>>('/inventories/requests', data),

  updateRequest: (id: number, data: UpdateSparePartRequestInput) =>
    request.put<any, ApiResponse<SparePartRequest>>(`/inventories/requests/${id}`, data),

  cancelRequest: (id: number, data?: { remark?: string }) =>
    request.post<any, ApiResponse>(`/inventories/requests/${id}/cancel`, data),

  listTransfers: (params?: TransferQuery) =>
    request.get<any, ApiResponse<PaginatedResult<Transfer>>>('/inventories/transfers', { params }),

  createTransfer: (data: CreateTransferInput) =>
    request.post<any, ApiResponse<Transfer>>('/inventories/transfers', data),

  updateTransfer: (id: number, data: UpdateTransferInput) =>
    request.put<any, ApiResponse<Transfer>>(`/inventories/transfers/${id}`, data),

  receiveTransfer: (id: number, data?: { remark?: string }) =>
    request.post<any, ApiResponse<Transfer>>(`/inventories/transfers/${id}/receive`, data),
};
