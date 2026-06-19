import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { logOperation } from '../services/logService';
import { LogAction } from '../constants/enums';

export const listSpareParts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { keyword, category } = req.query;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { partCode: { contains: keyword as string } },
        { name: { contains: keyword as string } },
      ];
    }
    if (category) where.category = category as string;

    const [parts, total] = await Promise.all([
      prisma.sparePart.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sparePart.count({ where }),
    ]);

    const result = buildPaginatedResult(parts, total, page, pageSize);
    success(res, result);
  } catch (err) {
    error(res, '获取备件列表失败', 500);
  }
};

export const getSparePart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const part = await prisma.sparePart.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { inventories: { include: { store: true } } },
    });
    if (!part) {
      error(res, '备件不存在', 404);
      return;
    }
    success(res, part);
  } catch (err) {
    error(res, '获取备件信息失败', 500);
  }
};

export const createSparePart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.sparePart.findUnique({ where: { partCode: req.body.partCode } });
    if (existing) {
      error(res, '备件编号已存在', 400);
      return;
    }
    const part = await prisma.sparePart.create({ data: req.body });

    await logOperation({
      action: LogAction.CREATE,
      module: 'SPARE_PART',
      targetId: part.id,
      operatorId: req.user!.userId,
      detail: `创建备件: ${req.body.partCode} - ${req.body.name}`,
      newValue: req.body,
      ipAddress: req.ip,
    });

    success(res, part, '备件创建成功', 201);
  } catch (err: any) {
    error(res, `创建备件失败: ${err.message}`, 500);
  }
};

export const updateSparePart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.sparePart.findUnique({ where: { id } });
    if (!existing) {
      error(res, '备件不存在', 404);
      return;
    }
    const part = await prisma.sparePart.update({ where: { id }, data: req.body });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'SPARE_PART',
      targetId: part.id,
      operatorId: req.user!.userId,
      detail: `更新备件: ${part.partCode}`,
      newValue: req.body,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, part, '备件更新成功');
  } catch (err: any) {
    error(res, `更新备件失败: ${err.message}`, 500);
  }
};

export const deleteSparePart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.sparePart.findUnique({ where: { id } });
    if (!existing) {
      error(res, '备件不存在', 404);
      return;
    }
    const invCount = await prisma.inventory.count({ where: { sparePartId: id } });
    if (invCount > 0) {
      error(res, '该备件存在库存记录，无法删除', 400);
      return;
    }
    await prisma.sparePart.delete({ where: { id } });

    await logOperation({
      action: LogAction.DELETE,
      module: 'SPARE_PART',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `删除备件: ${existing.partCode}`,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, null, '备件删除成功');
  } catch (err: any) {
    error(res, `删除备件失败: ${err.message}`, 500);
  }
};
