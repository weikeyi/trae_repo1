import type {
  TicketStatus,
  UrgencyLevel,
  SparePartRequestStatus,
  TransferStatus,
  Role,
  InventoryChangeType,
  RestockSuggestionPriority,
  RestockSuggestionStatus,
  PurchasePlanStatus,
  PurchaseReceiptStatus,
} from '@/types';

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: '系统管理员',
  STORE_MANAGER: '门店店长',
  TECHNICIAN: '维修员',
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  CREATED: '待派单',
  ASSIGNED: '已派单',
  TECHNICIAN_ON_WAY: '维修员到场',
  DIAGNOSING: '诊断中',
  WAITING_SPARE_PARTS: '等待备件',
  REPAIRING: '维修中',
  COMPLETED: '维修完成',
  CANNOT_REPAIR: '无法维修',
  ACCEPTED: '验收通过',
  REJECTED: '验收驳回',
  CANCELLED: '已取消',
  MERGED: '已合并',
  ESCALATED: '已升级',
  REJECTED_BY_TECHNICIAN: '维修员拒单',
};

export const TICKET_STATUS_TYPE: Record<TicketStatus, 'info' | 'warning' | 'success' | 'danger' | 'primary' | ''> = {
  CREATED: 'info',
  ASSIGNED: 'warning',
  TECHNICIAN_ON_WAY: 'primary',
  DIAGNOSING: 'primary',
  WAITING_SPARE_PARTS: 'warning',
  REPAIRING: 'primary',
  COMPLETED: 'success',
  CANNOT_REPAIR: 'danger',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'info',
  MERGED: 'info',
  ESCALATED: 'danger',
  REJECTED_BY_TECHNICIAN: 'warning',
};

export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
};

export const URGENCY_TYPE: Record<UrgencyLevel, 'info' | 'warning' | 'danger' | 'success'> = {
  LOW: 'info',
  MEDIUM: 'warning',
  HIGH: 'danger',
  URGENT: 'danger',
};

export const REQUEST_STATUS_LABEL: Record<SparePartRequestStatus, string> = {
  PENDING: '待处理',
  APPROVED: '已批准',
  REJECTED: '已拒绝',
  PARTIAL_FULFILLED: '部分出库',
  FULL_FULFILLED: '全部完成',
  BACKORDER: '缺货待补',
  CANCELLED: '已取消',
};

export const REQUEST_STATUS_TYPE: Record<SparePartRequestStatus, string> = {
  PENDING: 'warning',
  APPROVED: 'primary',
  REJECTED: 'danger',
  PARTIAL_FULFILLED: 'warning',
  FULL_FULFILLED: 'success',
  BACKORDER: 'info',
  CANCELLED: 'info',
};

export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  PENDING: '待发货',
  IN_TRANSIT: '运输中',
  RECEIVED: '已收货',
  CANCELLED: '已取消',
};

export const TRANSFER_STATUS_TYPE: Record<TransferStatus, string> = {
  PENDING: 'warning',
  IN_TRANSIT: 'primary',
  RECEIVED: 'success',
  CANCELLED: 'info',
};

export const FAULT_TYPES = [
  '空调维修',
  '制冷设备',
  '电气维修',
  '电路检修',
  '电梯设备',
  '机械故障',
  '其他',
];

export const EQUIPMENT_CATEGORIES = [
  '空调设备',
  '制冷设备',
  '电气设备',
  '电梯设备',
  '机械设备',
  '其他',
];

export const SPARE_PART_CATEGORIES = [
  '空调配件',
  '制冷配件',
  '电气配件',
  '电梯配件',
  '机械配件',
  '其他',
];

export const REGIONS = ['华东', '华北', '华南', '华中', '西南', '西北', '东北', 'HQ'];

export const INVENTORY_CHANGE_TYPE_LABEL: Record<InventoryChangeType, string> = {
  REQUEST_LOCK: '申请锁定',
  REQUEST_RELEASE: '申请释放',
  TRANSFER_OUT: '调拨出库',
  TRANSFER_IN: '调拨入库',
  TRANSFER_CANCEL_RETURN: '调拨取消退回',
  ADMIN_ADJUST: '管理员调整',
  PURCHASE_IN: '采购入库',
};

export const INVENTORY_CHANGE_TYPE_TYPE: Record<InventoryChangeType, 'warning' | 'success' | 'danger' | 'info' | 'primary' | ''> = {
  REQUEST_LOCK: 'warning',
  REQUEST_RELEASE: 'success',
  TRANSFER_OUT: 'danger',
  TRANSFER_IN: 'primary',
  TRANSFER_CANCEL_RETURN: 'info',
  ADMIN_ADJUST: '',
  PURCHASE_IN: 'success',
};

export const RESTOCK_PRIORITY_LABEL: Record<RestockSuggestionPriority, string> = {
  URGENT: '紧急',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

export const RESTOCK_PRIORITY_TYPE: Record<RestockSuggestionPriority, 'danger' | 'warning' | 'primary' | 'info'> = {
  URGENT: 'danger',
  HIGH: 'warning',
  MEDIUM: 'primary',
  LOW: 'info',
};

export const RESTOCK_STATUS_LABEL: Record<RestockSuggestionStatus, string> = {
  PENDING: '待处理',
  CONVERTED: '已生成计划',
  DISMISSED: '已忽略',
};

export const RESTOCK_STATUS_TYPE: Record<RestockSuggestionStatus, 'warning' | 'success' | 'info'> = {
  PENDING: 'warning',
  CONVERTED: 'success',
  DISMISSED: 'info',
};

export const PURCHASE_PLAN_STATUS_LABEL: Record<PurchasePlanStatus, string> = {
  DRAFT: '草稿',
  SUBMITTED: '待审批',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  CANCELLED: '已取消',
  PARTIAL_RECEIVED: '部分入库',
  FULL_RECEIVED: '入库完成',
};

export const PURCHASE_PLAN_STATUS_TYPE: Record<PurchasePlanStatus, 'info' | 'warning' | 'primary' | 'danger' | 'success'> = {
  DRAFT: 'info',
  SUBMITTED: 'warning',
  APPROVED: 'primary',
  REJECTED: 'danger',
  CANCELLED: 'info',
  PARTIAL_RECEIVED: 'warning',
  FULL_RECEIVED: 'success',
};

export const PURCHASE_RECEIPT_STATUS_LABEL: Record<PurchaseReceiptStatus, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
};

export const PURCHASE_RECEIPT_STATUS_TYPE: Record<PurchaseReceiptStatus, 'warning' | 'success'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
};
