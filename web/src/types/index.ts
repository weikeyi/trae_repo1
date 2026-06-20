export type Role = 'ADMIN' | 'STORE_MANAGER' | 'TECHNICIAN';

export type TicketStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'TECHNICIAN_ON_WAY'
  | 'DIAGNOSING'
  | 'WAITING_SPARE_PARTS'
  | 'REPAIRING'
  | 'COMPLETED'
  | 'CANNOT_REPAIR'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'MERGED'
  | 'ESCALATED'
  | 'REJECTED_BY_TECHNICIAN';

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SparePartRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIAL_FULFILLED'
  | 'FULL_FULFILLED'
  | 'BACKORDER'
  | 'CANCELLED';

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface User {
  id: number;
  username: string;
  realName: string;
  phone?: string;
  email?: string;
  role: Role;
  storeId?: number | null;
  isActive: boolean;
  store?: Store;
  technician?: TechnicianProfile;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianProfile {
  id: number;
  userId: number;
  skills: string[];
  regions: string[];
  maxLoad: number;
  currentLoad: number;
  rating: number;
  completedCount: number;
}

export interface Store {
  id: number;
  storeCode: string;
  name: string;
  address: string;
  region: string;
  phone?: string;
  managerId?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: number;
  equipmentCode: string;
  name: string;
  model?: string | null;
  category: string;
  storeId: number;
  store?: Store;
  purchaseDate?: string | null;
  lastMaintenanceDate?: string | null;
  status: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepairTicket {
  id: number;
  ticketNo: string;
  equipmentId: number;
  equipment?: Equipment;
  storeId: number;
  store?: Store;
  faultType: string;
  description: string;
  imageUrls: string[];
  urgency: UrgencyLevel;
  expectedTime?: string | null;
  status: TicketStatus;
  createdById: number;
  createdBy?: { id: number; realName: string; username: string };
  assignedToId?: number | null;
  assignedTo?: { id: number; realName: string; username: string; technician?: TechnicianProfile };
  diagnosis?: string | null;
  repairResult?: string | null;
  rejectReason?: string | null;
  mergedTicketId?: number | null;
  mergedTicket?: RepairTicket | null;
  mergedChildren?: RepairTicket[];
  slaDeadline?: string | null;
  escalated: boolean;
  escalationReason?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  acceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory?: StatusHistory[];
  sparePartRequests?: SparePartRequest[];
}

export interface StatusHistory {
  id: number;
  ticketId: number;
  fromStatus?: TicketStatus | null;
  toStatus: TicketStatus;
  operatorId: number;
  operator?: { id: number; realName: string };
  remark?: string | null;
  createdAt: string;
}

export interface SparePart {
  id: number;
  partCode: string;
  name: string;
  category: string;
  unit: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: number;
  sparePartId: number;
  sparePart?: SparePart;
  storeId: number;
  store?: Store;
  quantity: number;
  lockedQty: number;
  availableQty: number;
  minStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface SparePartRequest {
  id: number;
  requestNo: string;
  ticketId: number;
  ticket?: { ticketNo: string };
  sparePartId: number;
  sparePart?: SparePart;
  requestQty: number;
  fulfilledQty: number;
  status: SparePartRequestStatus;
  fromStoreId?: number | null;
  fromStore?: Store;
  toStoreId: number;
  toStore?: Store;
  requestedById: number;
  requestedBy?: { id: number; realName: string };
  approvedById?: number | null;
  approvedBy?: { id: number; realName: string };
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  transfers?: Transfer[];
}

export interface Transfer {
  id: number;
  transferNo: string;
  requestId: number;
  sparePartId: number;
  sparePart?: SparePart;
  fromStoreId: number;
  fromStore?: Store;
  toStoreId: number;
  toStore?: Store;
  quantity: number;
  status: TransferStatus;
  operatorId: number;
  operator?: { id: number; realName: string };
  shippedAt?: string | null;
  receivedAt?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlaRule {
  id: number;
  urgency: UrgencyLevel;
  responseMinutes: number;
  resolutionMinutes: number;
  escalationMinutes: number;
  description?: string | null;
}

export interface OperationLog {
  id: number;
  action: string;
  module: string;
  targetId?: number | null;
  targetType?: string | null;
  operatorId: number;
  operator?: { id: number; username: string; realName: string };
  detail?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
