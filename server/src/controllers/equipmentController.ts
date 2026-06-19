import { Response } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { logOperation } from '../services/logService';
import { LogAction } from '@prisma/client';

export const listEquipments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { keyword, storeId, category, status } = req.query;

    const where: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    } else if (storeId) {
      where.storeId = parseInt(storeId as string, 10);
    }
    if (keyword) {
      where.OR = [
        { equipmentCode: { contains: keyword as string } },
        { name: { contains: keyword as string } },
        { model: { contains: keyword as string } },
      ];
    }
    if (category) where.category = category as string;
    if (status) where.status = status as string;

    const [equipments, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        skip,
        take,
        include: { store: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.equipment.count({ where }),
    ]);

    const result = buildPaginatedResult(equipments, total, page, pageSize);
    success(res, result);
  } catch (err) {
    error(res, '获取设备列表失败', 500);
  }
};

export const getEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        store: true,
        tickets: { include: { assignedTo: true }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!equipment) {
      error(res, '设备不存在', 404);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId !== equipment.storeId) {
      error(res, '权限不足', 403);
      return;
    }
    success(res, equipment);
  } catch (err) {
    error(res, '获取设备信息失败', 500);
  }
};

export const createEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = { ...req.body };
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.lastMaintenanceDate) data.lastMaintenanceDate = new Date(data.lastMaintenanceDate);

    if (req.user?.role === Role.STORE_MANAGER) {
      data.storeId = req.user.storeId;
    }

    const existing = await prisma.equipment.findUnique({ where: { equipmentCode: data.equipmentCode } });
    if (existing) {
      error(res, '设备编号已存在', 400);
      return;
    }

    const equipment = await prisma.equipment.create({ data });

    await logOperation({
      action: LogAction.CREATE,
      module: 'EQUIPMENT',
      targetId: equipment.id,
      targetType: 'Equipment',
      operatorId: req.user!.userId,
      detail: `创建设备: ${data.equipmentCode} - ${data.name}`,
      newValue: data,
      ipAddress: req.ip,
    });

    success(res, equipment, '设备创建成功', 201);
  } catch (err: any) {
    error(res, `创建设备失败: ${err.message}`, 500);
  }
};

export const updateEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.equipment.findUnique({ where: { id } });
    if (!existing) {
      error(res, '设备不存在', 404);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId !== existing.storeId) {
      error(res, '权限不足', 403);
      return;
    }

    const data = { ...req.body };
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.lastMaintenanceDate) data.lastMaintenanceDate = new Date(data.lastMaintenanceDate);

    const equipment = await prisma.equipment.update({ where: { id }, data });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'EQUIPMENT',
      targetId: equipment.id,
      targetType: 'Equipment',
      operatorId: req.user!.userId,
      detail: `更新设备: ${equipment.equipmentCode}`,
      newValue: data,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, equipment, '设备更新成功');
  } catch (err: any) {
    error(res, `更新设备失败: ${err.message}`, 500);
  }
};

export const deleteEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.equipment.findUnique({ where: { id } });
    if (!existing) {
      error(res, '设备不存在', 404);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId !== existing.storeId) {
      error(res, '权限不足', 403);
      return;
    }

    const ticketCount = await prisma.repairTicket.count({ where: { equipmentId: id } });
    if (ticketCount > 0) {
      error(res, '该设备有关联工单，无法删除', 400);
      return;
    }

    await prisma.equipment.delete({ where: { id } });

    await logOperation({
      action: LogAction.DELETE,
      module: 'EQUIPMENT',
      targetId: id,
      targetType: 'Equipment',
      operatorId: req.user!.userId,
      detail: `删除设备: ${existing.equipmentCode}`,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, null, '设备删除成功');
  } catch (err: any) {
    error(res, `删除设备失败: ${err.message}`, 500);
  }
};
