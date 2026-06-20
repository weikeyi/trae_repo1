import request from '@/utils/request';
import type {
  ApiResponse,
  PaginatedResult,
  RestockSuggestion,
  RestockSuggestionPriority,
  RestockSuggestionStatus,
  PurchasePlan,
  PurchasePlanStatus,
  PurchaseReceipt,
  PurchaseReceiptStatus,
  Store,
  SparePart,
} from '@/types';

export interface RestockSuggestionQuery {
  page?: number;
  pageSize?: number;
  storeId?: number;
  sparePartId?: number;
  priority?: RestockSuggestionPriority;
  status?: RestockSuggestionStatus;
  keyword?: string;
}

export interface PurchasePlanQuery {
  page?: number;
  pageSize?: number;
  storeId?: number;
  status?: PurchasePlanStatus;
  keyword?: string;
}

export interface PurchaseReceiptQuery {
  page?: number;
  pageSize?: number;
  planId?: number;
  storeId?: number;
  status?: PurchaseReceiptStatus;
}

export interface GenerateRestockInput {
  storeId?: number;
  force?: boolean;
}

export interface CreatePlanFromSuggestionsInput {
  suggestionIds: number[];
  remark?: string;
}

export interface CreatePurchasePlanInput {
  storeId: number;
  items: Array<{
    sparePartId: number;
    planQty: number;
    unitPrice?: number;
    remark?: string;
  }>;
  remark?: string;
}

export interface UpdatePurchasePlanItemsInput {
  items: Array<{
    sparePartId: number;
    planQty: number;
    unitPrice?: number;
    remark?: string;
  }>;
  remark?: string;
}

export interface RejectPurchasePlanInput {
  rejectReason: string;
}

export interface CancelPurchasePlanInput {
  cancelReason: string;
}

export interface CreatePurchaseReceiptInput {
  planId: number;
  items: Array<{
    planItemId: number;
    quantity: number;
    unitPrice?: number;
  }>;
  remark?: string;
}

export const purchaseApi = {
  generateRestockSuggestions: (data: GenerateRestockInput) =>
    request.post<any, ApiResponse<{ count: number; items: RestockSuggestion[] }>>(
      '/purchase/restock-suggestions/generate',
      data,
    ),

  listRestockSuggestions: (params?: RestockSuggestionQuery) =>
    request.get<any, ApiResponse<PaginatedResult<RestockSuggestion>>>(
      '/purchase/restock-suggestions',
      { params },
    ),

  dismissRestockSuggestion: (id: number) =>
    request.post<any, ApiResponse>(`/purchase/restock-suggestions/${id}/dismiss`),

  createPlanFromSuggestions: (data: CreatePlanFromSuggestionsInput) =>
    request.post<any, ApiResponse<PurchasePlan>>('/purchase/plans/from-suggestions', data),

  createPurchasePlan: (data: CreatePurchasePlanInput) =>
    request.post<any, ApiResponse<PurchasePlan>>('/purchase/plans', data),

  listPurchasePlans: (params?: PurchasePlanQuery) =>
    request.get<any, ApiResponse<PaginatedResult<PurchasePlan>>>(
      '/purchase/plans',
      { params },
    ),

  getPurchasePlan: (id: number) =>
    request.get<any, ApiResponse<PurchasePlan>>(`/purchase/plans/${id}`),

  updatePurchasePlanItems: (id: number, data: UpdatePurchasePlanItemsInput) =>
    request.put<any, ApiResponse<PurchasePlan>>(`/purchase/plans/${id}/items`, data),

  submitPurchasePlan: (id: number) =>
    request.post<any, ApiResponse<PurchasePlan>>(`/purchase/plans/${id}/submit`),

  approvePurchasePlan: (id: number) =>
    request.post<any, ApiResponse<PurchasePlan>>(`/purchase/plans/${id}/approve`),

  rejectPurchasePlan: (id: number, data: RejectPurchasePlanInput) =>
    request.post<any, ApiResponse<PurchasePlan>>(`/purchase/plans/${id}/reject`, data),

  cancelPurchasePlan: (id: number, data: CancelPurchasePlanInput) =>
    request.post<any, ApiResponse<PurchasePlan>>(`/purchase/plans/${id}/cancel`, data),

  createPurchaseReceipt: (data: CreatePurchaseReceiptInput) =>
    request.post<any, ApiResponse<PurchaseReceipt>>('/purchase/receipts', data),

  confirmPurchaseReceipt: (id: number) =>
    request.post<any, ApiResponse<PurchaseReceipt>>(`/purchase/receipts/${id}/confirm`),

  listPurchaseReceipts: (params?: PurchaseReceiptQuery) =>
    request.get<any, ApiResponse<PaginatedResult<PurchaseReceipt>>>(
      '/purchase/receipts',
      { params },
    ),

  deletePurchaseReceipt: (id: number) =>
    request.delete<any, ApiResponse>(`/purchase/receipts/${id}`),
};
