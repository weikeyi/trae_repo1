import { Response } from 'express';
import { createObjectCsvStringifier } from 'csv-writer';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';

export const listLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { module, action, operatorId, dateFrom, dateTo, keyword } = req.query;

    const where: any = {};
    if (module) where.module = module as string;
    if (action) where.action = action as any;
    if (operatorId) where.operatorId = parseInt(operatorId as string, 10);
    if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom as string) };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo as string) };
    if (keyword) where.detail = { contains: keyword as string };

    const [logs, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        skip,
        take,
        include: { operator: { select: { id: true, username: true, realName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.operationLog.count({ where }),
    ]);

    const result = buildPaginatedResult(logs, total, page, pageSize);
    success(res, result);
  } catch (err: any) {
    error(res, `获取日志列表失败: ${err.message}`, 500);
  }
};

export const exportLogsCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { module, dateFrom, dateTo } = req.query;
    const where: any = {};
    if (module) where.module = module as string;
    if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom as string) };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo as string) };

    const logs = await prisma.operationLog.findMany({
      where,
      include: { operator: { select: { realName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'ID' },
        { id: 'action', title: '操作类型' },
        { id: 'module', title: '模块' },
        { id: 'targetType', title: '对象类型' },
        { id: 'targetId', title: '对象ID' },
        { id: 'operator', title: '操作人' },
        { id: 'detail', title: '详情' },
        { id: 'ipAddress', title: 'IP地址' },
        { id: 'createdAt', title: '时间' },
      ],
    });

    const records = logs.map((l) => ({
      id: l.id,
      action: l.action,
      module: l.module,
      targetType: l.targetType || '',
      targetId: l.targetId || '',
      operator: l.operator?.realName || l.operator?.username || '',
      detail: l.detail || '',
      ipAddress: l.ipAddress || '',
      createdAt: l.createdAt.toISOString(),
    }));

    const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="logs_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    error(res, `导出失败: ${err.message}`, 500);
  }
};
