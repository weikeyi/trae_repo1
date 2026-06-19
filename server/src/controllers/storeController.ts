import { Response } from 'express';
import { Role, LogAction } from '../constants/enums';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { logOperation } from '../services/logService';

export const listStores = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { keyword, region, isActive } = req.query;

    const where: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.id = req.user.storeId;
    }
    if (keyword) {
      where.OR = [
        { storeCode: { contains: keyword as string } },
        { name: { contains: keyword as string } },
      ];
    }
    if (region) where.region = region as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take,
        include: { users: { where: { role: Role.STORE_MANAGER } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.store.count({ where }),
    ]);

    const result = buildPaginatedResult(stores, total, page, pageSize);
    success(res, result);
  } catch (err) {
    error(res, '获取门店列表失败', 500);
  }
};

export const getStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        users: true,
        equipments: true,
        inventories: { include: { sparePart: true } },
      },
    });
    if (!store) {
      error(res, '门店不存在', 404);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId !== store.id) {
      error(res, '权限不足', 403);
      return;
    }
    success(res, store);
  } catch (err) {
    error(res, '获取门店信息失败', 500);
  }
};

export const createStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeCode, name, address, region, phone, managerId } = req.body;

    const existing = await prisma.store.findUnique({ where: { storeCode } });
    if (existing) {
      error(res, '门店编号已存在', 400);
      return;
    }

    const store = await prisma.store.create({
      data: { storeCode, name, address, region, phone, managerId },
    });

    await logOperation({
      action: LogAction.CREATE,
      module: 'STORE',
      targetId: store.id,
      targetType: 'Store',
      operatorId: req.user!.userId,
      detail: `创建门店: ${storeCode} - ${name}`,
      newValue: req.body,
      ipAddress: req.ip,
    });

    success(res, store, '门店创建成功', 201);
  } catch (err: any) {
    error(res, `创建门店失败: ${err.message}`, 500);
  }
};

export const updateStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.store.findUnique({ where: { id } });
    if (!existing) {
      error(res, '门店不存在', 404);
      return;
    }

    const store = await prisma.store.update({
      where: { id },
      data: req.body,
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'STORE',
      targetId: store.id,
      targetType: 'Store',
      operatorId: req.user!.userId,
      detail: `更新门店: ${store.storeCode}`,
      newValue: req.body,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, store, '门店更新成功');
  } catch (err: any) {
    error(res, `更新门店失败: ${err.message}`, 500);
  }
};

export const deleteStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.store.findUnique({ where: { id } });
    if (!existing) {
      error(res, '门店不存在', 404);
      return;
    }

    const ticketCount = await prisma.repairTicket.count({ where: { storeId: id } });
    if (ticketCount > 0) {
      error(res, '该门店有关联工单，无法删除', 400);
      return;
    }

    await prisma.store.update({
      where: { id },
      data: { isActive: false },
    });

    await logOperation({
      action: LogAction.DELETE,
      module: 'STORE',
      targetId: id,
      targetType: 'Store',
      operatorId: req.user!.userId,
      detail: `禁用门店: ${existing.storeCode}`,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, null, '门店已禁用');
  } catch (err: any) {
    error(res, `禁用门店失败: ${err.message}`, 500);
  }
};
