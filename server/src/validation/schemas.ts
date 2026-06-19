import { z } from 'zod';
import { Role, UrgencyLevel, TicketStatus, SparePartRequestStatus, TransferStatus } from '@prisma/client';

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export const createUserSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(6, '密码至少6位'),
  realName: z.string().min(1, '真实姓名不能为空'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.nativeEnum(Role),
  storeId: z.number().optional(),
  skills: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  maxLoad: z.number().min(1).optional(),
});

export const updateUserSchema = z.object({
  realName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.nativeEnum(Role).optional(),
  storeId: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
  skills: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  maxLoad: z.number().min(1).optional(),
});

export const createStoreSchema = z.object({
  storeCode: z.string().min(1, '门店编号不能为空'),
  name: z.string().min(1, '门店名称不能为空'),
  address: z.string().min(1, '地址不能为空'),
  region: z.string().min(1, '区域不能为空'),
  phone: z.string().optional(),
  managerId: z.number().optional(),
});

export const updateStoreSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createEquipmentSchema = z.object({
  equipmentCode: z.string().min(1, '设备编号不能为空'),
  name: z.string().min(1, '设备名称不能为空'),
  model: z.string().optional(),
  category: z.string().min(1, '设备类别不能为空'),
  storeId: z.number(),
  purchaseDate: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
});

export const updateEquipmentSchema = z.object({
  name: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  storeId: z.number().optional(),
  purchaseDate: z.string().optional(),
  lastMaintenanceDate: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
});

export const createTicketSchema = z.object({
  equipmentId: z.number(),
  faultType: z.string().min(1, '故障类型不能为空'),
  description: z.string().min(1, '故障描述不能为空'),
  imageUrls: z.array(z.string()).optional(),
  urgency: z.nativeEnum(UrgencyLevel),
  expectedTime: z.string().optional(),
});

export const assignTicketSchema = z.object({
  technicianId: z.number(),
  remark: z.string().optional(),
});

export const updateTicketStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
  remark: z.string().optional(),
  diagnosis: z.string().optional(),
  repairResult: z.string().optional(),
  rejectReason: z.string().optional(),
});

export const createSparePartSchema = z.object({
  partCode: z.string().min(1, '备件编号不能为空'),
  name: z.string().min(1, '备件名称不能为空'),
  category: z.string().min(1, '类别不能为空'),
  unit: z.string().min(1, '单位不能为空'),
  description: z.string().optional(),
});

export const updateSparePartSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
});

export const updateInventorySchema = z.object({
  quantity: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
});

export const createSparePartRequestSchema = z.object({
  ticketId: z.number(),
  sparePartId: z.number(),
  requestQty: z.number().min(1, '申请数量必须大于0'),
  fromStoreId: z.number().optional(),
  remark: z.string().optional(),
});

export const updateSparePartRequestSchema = z.object({
  status: z.nativeEnum(SparePartRequestStatus),
  remark: z.string().optional(),
  fulfilledQty: z.number().min(0).optional(),
});

export const createTransferSchema = z.object({
  requestId: z.number(),
  sparePartId: z.number(),
  fromStoreId: z.number(),
  toStoreId: z.number(),
  quantity: z.number().min(1),
  remark: z.string().optional(),
});

export const updateTransferSchema = z.object({
  status: z.nativeEnum(TransferStatus),
  remark: z.string().optional(),
});

export const createSlaSchema = z.object({
  urgency: z.nativeEnum(UrgencyLevel),
  responseMinutes: z.number().min(1),
  resolutionMinutes: z.number().min(1),
  escalationMinutes: z.number().min(1),
  description: z.string().optional(),
});

export const updateSlaSchema = z.object({
  responseMinutes: z.number().min(1).optional(),
  resolutionMinutes: z.number().min(1).optional(),
  escalationMinutes: z.number().min(1).optional(),
  description: z.string().optional(),
});

export const mergeTicketSchema = z.object({
  targetTicketId: z.number(),
  remark: z.string().optional(),
});
