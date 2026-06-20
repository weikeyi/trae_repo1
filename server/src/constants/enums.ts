// 枚举常量集合，替代 Prisma 原生 enum（SQLite 不支持）
// 所有值通过字符串存储在数据库中，业务层使用这些常量进行校验和比较

export const Role = {
  ADMIN: 'ADMIN',
  STORE_MANAGER: 'STORE_MANAGER',
  TECHNICIAN: 'TECHNICIAN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const TicketStatus = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED',
  TECHNICIAN_ON_WAY: 'TECHNICIAN_ON_WAY',
  DIAGNOSING: 'DIAGNOSING',
  WAITING_SPARE_PARTS: 'WAITING_SPARE_PARTS',
  REPAIRING: 'REPAIRING',
  COMPLETED: 'COMPLETED',
  CANNOT_REPAIR: 'CANNOT_REPAIR',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  MERGED: 'MERGED',
  ESCALATED: 'ESCALATED',
  REJECTED_BY_TECHNICIAN: 'REJECTED_BY_TECHNICIAN',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const UrgencyLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type UrgencyLevel = (typeof UrgencyLevel)[keyof typeof UrgencyLevel];

export const SparePartRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PARTIAL_FULFILLED: 'PARTIAL_FULFILLED',
  FULL_FULFILLED: 'FULL_FULFILLED',
  BACKORDER: 'BACKORDER',
  CANCELLED: 'CANCELLED',
} as const;
export type SparePartRequestStatus =
  (typeof SparePartRequestStatus)[keyof typeof SparePartRequestStatus];

export const TransferStatus = {
  PENDING: 'PENDING',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];

export const LogAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  ASSIGN: 'ASSIGN',
  REASSIGN: 'REASSIGN',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  EXPORT: 'EXPORT',
  LOCK: 'LOCK',
  UNLOCK: 'UNLOCK',
  TRANSFER: 'TRANSFER',
} as const;
export type LogAction = (typeof LogAction)[keyof typeof LogAction];

export const InventoryChangeType = {
  REQUEST_LOCK: 'REQUEST_LOCK',
  REQUEST_RELEASE: 'REQUEST_RELEASE',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_CANCEL_RETURN: 'TRANSFER_CANCEL_RETURN',
  ADMIN_ADJUST: 'ADMIN_ADJUST',
  PURCHASE_IN: 'PURCHASE_IN',
} as const;
export type InventoryChangeType = (typeof InventoryChangeType)[keyof typeof InventoryChangeType];

export const RestockSuggestionPriority = {
  URGENT: 'URGENT',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type RestockSuggestionPriority = (typeof RestockSuggestionPriority)[keyof typeof RestockSuggestionPriority];

export const RestockSuggestionStatus = {
  PENDING: 'PENDING',
  CONVERTED: 'CONVERTED',
  DISMISSED: 'DISMISSED',
} as const;
export type RestockSuggestionStatus = (typeof RestockSuggestionStatus)[keyof typeof RestockSuggestionStatus];

export const PurchasePlanStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  PARTIAL_RECEIVED: 'PARTIAL_RECEIVED',
  FULL_RECEIVED: 'FULL_RECEIVED',
} as const;
export type PurchasePlanStatus = (typeof PurchasePlanStatus)[keyof typeof PurchasePlanStatus];

export const PurchaseReceiptStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
} as const;
export type PurchaseReceiptStatus = (typeof PurchaseReceiptStatus)[keyof typeof PurchaseReceiptStatus];

// String(JSON) 数组辅助函数
// 现在 schema 中字段是 String 类型，存储 JSON.stringify 后的字符串
export const parseJsonArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const toJsonArray = (arr: string[]): string => {
  // 序列化为 JSON 字符串，以 String 形式存入 SQLite
  return JSON.stringify(Array.isArray(arr) ? arr : []);
};
