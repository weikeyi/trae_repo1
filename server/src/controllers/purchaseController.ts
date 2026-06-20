import { Response } from 'express';
import {
  Role,
  SparePartRequestStatus,
  TransferStatus,
  LogAction,
  InventoryChangeType,
  RestockSuggestionPriority,
  RestockSuggestionStatus,
  PurchasePlanStatus,
  PurchaseReceiptStatus,
  UrgencyLevel,
} from '../constants/enums';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { logOperation } from '../services/logService';
import { createInventoryLog } from '../services/inventoryLogService';

const generatePlanNo = (): string => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `PP${dateStr}${random}`;
};

const generateReceiptNo = (): string => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `PR${dateStr}${random}`;
};

const calcPriority = (gap: number, availableQty: number, minStock: number, pendingRequestQty: number, consumption30d: number): { priority: string; reason: string } => {
  const reasons: string[] = [];
  let score = 0;

  if (availableQty <= 0) {
    score += 100;
    reasons.push('库存已耗尽');
  } else if (availableQty < minStock * 0.3) {
    score += 60;
    reasons.push('库存严重不足');
  } else if (availableQty < minStock) {
    score += 30;
    reasons.push('库存低于安全线');
  }

  if (pendingRequestQty > 0) {
    score += 20 + Math.min(pendingRequestQty, 10) * 2;
    reasons.push(`有待处理申请 ${pendingRequestQty}`);
  }

  if (consumption30d > 0) {
    const daysLeft = availableQty / (consumption30d / 30);
    if (daysLeft < 3) {
      score += 40;
      reasons.push('预计3天内用完');
    } else if (daysLeft < 7) {
      score += 20;
      reasons.push('预计一周内用完');
    } else if (daysLeft < 14) {
      score += 10;
      reasons.push('预计两周内用完');
    }
  }

  let priority: string;
  if (score >= 80) priority = RestockSuggestionPriority.URGENT;
  else if (score >= 50) priority = RestockSuggestionPriority.HIGH;
  else if (score >= 20) priority = RestockSuggestionPriority.MEDIUM;
  else priority = RestockSuggestionPriority.LOW;

  const reason = reasons.length > 0 ? reasons.join('；') : '补充安全库存';
  return { priority, reason };
};

export const generateRestockSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeId, force } = req.body;

    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      if (storeId && storeId !== req.user.storeId) {
        error(res, '只能生成自己门店的补货建议', 403);
        return;
      }
    }

    const inventoryWhere: any = {};
    if (storeId) inventoryWhere.storeId = storeId;
    else if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      inventoryWhere.storeId = req.user.storeId;
    }

    const inventories = await prisma.inventory.findMany({
      where: inventoryWhere,
      include: { sparePart: true, store: true },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const suggestions: any[] = [];
    for (const inv of inventories) {
      const pendingRequestsRaw = await prisma.sparePartRequest.findMany({
        where: {
          sparePartId: inv.sparePartId,
          toStoreId: inv.storeId,
          status: { in: [SparePartRequestStatus.PENDING, SparePartRequestStatus.APPROVED, SparePartRequestStatus.BACKORDER, SparePartRequestStatus.PARTIAL_FULFILLED] },
          requestQty: { gt: 0 },
        },
        select: { requestQty: true, fulfilledQty: true },
      });
      const pendingRequestQty = pendingRequestsRaw.reduce((sum, r) => sum + Math.max(0, r.requestQty - r.fulfilledQty), 0);

      const inTransitQty = await prisma.transfer.aggregate({
        where: {
          sparePartId: inv.sparePartId,
          toStoreId: inv.storeId,
          status: { in: [TransferStatus.PENDING, TransferStatus.IN_TRANSIT] },
        },
        _sum: { quantity: true },
      });

      const consumptionLogs = await prisma.inventoryLog.findMany({
        where: {
          sparePartId: inv.sparePartId,
          storeId: inv.storeId,
          changeType: InventoryChangeType.TRANSFER_OUT,
          createdAt: { gte: thirtyDaysAgo },
        },
      });
      const consumption30d = consumptionLogs.reduce((sum, l) => sum + Math.max(0, l.quantityBefore - l.quantityAfter), 0);
      const netConsumption = Math.max(0, consumption30d);

      const safetyStock = Math.max(inv.minStock, Math.ceil(netConsumption * 0.3));
      const expectedDemand = Math.max(netConsumption, pendingRequestQty * 2);
      const effectiveAvailable = Math.max(0, inv.availableQty - pendingRequestQty + (inTransitQty._sum.quantity || 0));
      const expectedGap = Math.max(0, safetyStock + expectedDemand - effectiveAvailable);
      const suggestedQty = expectedGap;

      if (suggestedQty <= 0 && force !== true) continue;

      const { priority, reason } = calcPriority(
        expectedGap,
        inv.availableQty,
        safetyStock,
        pendingRequestQty,
        netConsumption,
      );

      suggestions.push({
        sparePartId: inv.sparePartId,
        storeId: inv.storeId,
        availableQty: inv.availableQty,
        lockedQty: inv.lockedQty,
        minStock: safetyStock,
        pendingRequestQty,
        inTransitQty: inTransitQty._sum.quantity || 0,
        consumption30d: netConsumption,
        suggestedQty: Math.max(suggestedQty, 0),
        expectedGap: Math.max(expectedGap, 0),
        reason,
        priority,
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const s of suggestions) {
        await tx.restockSuggestion.upsert({
          where: {
            sparePartId_storeId_status: {
              sparePartId: s.sparePartId,
              storeId: s.storeId,
              status: RestockSuggestionStatus.PENDING,
            },
          },
          update: {
            availableQty: s.availableQty,
            lockedQty: s.lockedQty,
            minStock: s.minStock,
            pendingRequestQty: s.pendingRequestQty,
            inTransitQty: s.inTransitQty,
            consumption30d: s.consumption30d,
            suggestedQty: s.suggestedQty,
            expectedGap: s.expectedGap,
            reason: s.reason,
            priority: s.priority,
          },
          create: {
            ...s,
            status: RestockSuggestionStatus.PENDING,
          },
        });
      }
    });

    await logOperation({
      action: LogAction.CREATE,
      module: 'RESTOCK_SUGGESTION',
      operatorId: req.user!.userId,
      detail: `生成 ${suggestions.length} 条补货建议`,
      ipAddress: req.ip,
    });

    success(res, { count: suggestions.length, items: suggestions }, `已生成 ${suggestions.length} 条补货建议`);
  } catch (err: any) {
    error(res, `生成补货建议失败: ${err.message}`, 500);
  }
};

export const listRestockSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { storeId, sparePartId, priority, status, keyword } = req.query;

    const where: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    } else if (storeId) {
      where.storeId = parseInt(storeId as string, 10);
    }
    if (sparePartId) where.sparePartId = parseInt(sparePartId as string, 10);
    if (priority) where.priority = priority as string;
    if (status) where.status = status as string;
    if (keyword) {
      where.sparePart = {
        OR: [
          { partCode: { contains: keyword as string } },
          { name: { contains: keyword as string } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      prisma.restockSuggestion.findMany({
        where,
        skip,
        take,
        include: {
          sparePart: true,
          store: true,
          purchasePlan: { select: { id: true, planNo: true, status: true } },
          convertedBy: { select: { id: true, realName: true } },
        },
        orderBy: [
          { priority: 'asc' },
          { expectedGap: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.restockSuggestion.count({ where }),
    ]);

    const result = buildPaginatedResult(items, total, page, pageSize);
    success(res, result);
  } catch (err: any) {
    error(res, `获取补货建议列表失败: ${err.message}`, 500);
  }
};

export const dismissRestockSuggestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.restockSuggestion.findUnique({ where: { id } });
    if (!existing) {
      error(res, '补货建议不存在', 404);
      return;
    }
    if (existing.status !== RestockSuggestionStatus.PENDING) {
      error(res, '只能忽略待处理状态的建议', 400);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== existing.storeId) {
      error(res, '只能忽略自己门店的建议', 403);
      return;
    }

    await prisma.restockSuggestion.update({
      where: { id },
      data: { status: RestockSuggestionStatus.DISMISSED },
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'RESTOCK_SUGGESTION',
      targetId: id,
      operatorId: req.user!.userId,
      detail: '忽略补货建议',
      ipAddress: req.ip,
    });

    success(res, null, '已忽略该建议');
  } catch (err: any) {
    error(res, `忽略补货建议失败: ${err.message}`, 500);
  }
};

export const createPurchasePlanFromSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { suggestionIds, remark } = req.body;
    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      error(res, '请选择补货建议', 400);
      return;
    }

    const suggestions = await prisma.restockSuggestion.findMany({
      where: { id: { in: suggestionIds }, status: RestockSuggestionStatus.PENDING },
      include: { sparePart: true, store: true },
    });
    if (suggestions.length === 0) {
      error(res, '所选建议不存在或已处理', 400);
      return;
    }

    const storeIds = Array.from(new Set(suggestions.map(s => s.storeId)));
    if (storeIds.length > 1) {
      error(res, '只能为同一门店创建采购计划', 400);
      return;
    }
    const planStoreId = storeIds[0];

    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== planStoreId) {
      error(res, '只能为自己门店创建采购计划', 403);
      return;
    }

    const planNo = generatePlanNo();
    const totalQty = suggestions.reduce((sum, s) => sum + s.suggestedQty, 0);
    const items = suggestions.map(s => ({
      sparePartId: s.sparePartId,
      planQty: s.suggestedQty,
      remark: s.reason,
    }));

    const plan = await prisma.$transaction(async (tx) => {
      const result = await tx.purchasePlan.create({
        data: {
          planNo,
          storeId: planStoreId,
          status: PurchasePlanStatus.DRAFT,
          totalQty,
          remark,
          createdById: req.user!.userId,
          items: {
            create: items,
          },
        },
        include: { items: true },
      });

      for (const s of suggestions) {
        await tx.restockSuggestion.update({
          where: { id: s.id },
          data: {
            status: RestockSuggestionStatus.CONVERTED,
            purchasePlanId: result.id,
            convertedById: req.user!.userId,
            convertedAt: new Date(),
          },
        });
      }
      return result;
    });

    await logOperation({
      action: LogAction.CREATE,
      module: 'PURCHASE_PLAN',
      targetId: plan.id,
      operatorId: req.user!.userId,
      detail: `从补货建议创建采购计划 ${planNo}，${suggestions.length} 个备件，${totalQty} 件`,
      ipAddress: req.ip,
    });

    success(res, plan, '采购计划创建成功', 201);
  } catch (err: any) {
    error(res, `创建采购计划失败: ${err.message}`, 500);
  }
};

export const createPurchasePlanManual = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeId, items, remark } = req.body;
    if (!storeId || !Array.isArray(items) || items.length === 0) {
      error(res, '请填写门店和采购明细', 400);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== storeId) {
      error(res, '只能为自己门店创建采购计划', 403);
      return;
    }

    for (const item of items) {
      if (!item.sparePartId || !item.planQty || item.planQty <= 0) {
        error(res, '采购明细不完整', 400);
        return;
      }
    }

    const planNo = generatePlanNo();
    const totalQty = items.reduce((sum: number, i: any) => sum + i.planQty, 0);

    const plan = await prisma.purchasePlan.create({
      data: {
        planNo,
        storeId,
        status: PurchasePlanStatus.DRAFT,
        totalQty,
        remark,
        createdById: req.user!.userId,
        items: {
          create: items.map((i: any) => ({
            sparePartId: i.sparePartId,
            planQty: i.planQty,
            unitPrice: i.unitPrice || 0,
            remark: i.remark,
          })),
        },
      },
      include: { items: true },
    });

    await logOperation({
      action: LogAction.CREATE,
      module: 'PURCHASE_PLAN',
      targetId: plan.id,
      operatorId: req.user!.userId,
      detail: `手动创建采购计划 ${planNo}，${items.length} 个备件，${totalQty} 件`,
      ipAddress: req.ip,
    });

    success(res, plan, '采购计划创建成功', 201);
  } catch (err: any) {
    error(res, `创建采购计划失败: ${err.message}`, 500);
  }
};

export const listPurchasePlans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { storeId, status, keyword } = req.query;

    const where: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    } else if (storeId) {
      where.storeId = parseInt(storeId as string, 10);
    }
    if (status) where.status = status as string;
    if (keyword) {
      where.OR = [
        { planNo: { contains: keyword as string } },
        { items: { some: { sparePart: { name: { contains: keyword as string } } } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.purchasePlan.findMany({
        where,
        skip,
        take,
        include: {
          store: true,
          createdBy: { select: { id: true, realName: true } },
          submittedBy: { select: { id: true, realName: true } },
          approvedBy: { select: { id: true, realName: true } },
          rejectedBy: { select: { id: true, realName: true } },
          cancelledBy: { select: { id: true, realName: true } },
          items: { include: { sparePart: true } },
          receipts: { include: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchasePlan.count({ where }),
    ]);

    const result = buildPaginatedResult(items, total, page, pageSize);
    success(res, result);
  } catch (err: any) {
    error(res, `获取采购计划列表失败: ${err.message}`, 500);
  }
};

export const getPurchasePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const plan = await prisma.purchasePlan.findUnique({
      where: { id },
      include: {
        store: true,
        createdBy: { select: { id: true, realName: true } },
        submittedBy: { select: { id: true, realName: true } },
        approvedBy: { select: { id: true, realName: true } },
        rejectedBy: { select: { id: true, realName: true } },
        cancelledBy: { select: { id: true, realName: true } },
        items: { include: { sparePart: true } },
        receipts: {
          include: {
            items: { include: { sparePart: true, planItem: true } },
            createdBy: { select: { id: true, realName: true } },
            confirmedBy: { select: { id: true, realName: true } },
          },
        },
        suggestions: { include: { sparePart: true } },
      },
    });
    if (!plan) {
      error(res, '采购计划不存在', 404);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== plan.storeId) {
      error(res, '无权查看其他门店的采购计划', 403);
      return;
    }
    success(res, plan);
  } catch (err: any) {
    error(res, `获取采购计划详情失败: ${err.message}`, 500);
  }
};

export const updatePurchasePlanItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { items, remark } = req.body;

    const existing = await prisma.purchasePlan.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      error(res, '采购计划不存在', 404);
      return;
    }
    if (existing.status !== PurchasePlanStatus.DRAFT) {
      error(res, '只能编辑草稿状态的采购计划', 400);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== existing.storeId) {
      error(res, '无权编辑其他门店的采购计划', 403);
      return;
    }
    if (existing.createdById !== req.user!.userId && req.user?.role !== Role.ADMIN) {
      error(res, '只能编辑自己创建的采购计划', 403);
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      error(res, '请填写采购明细', 400);
      return;
    }
    for (const item of items) {
      if (!item.sparePartId || !item.planQty || item.planQty <= 0) {
        error(res, '采购明细不完整', 400);
        return;
      }
    }

    const totalQty = items.reduce((sum: number, i: any) => sum + i.planQty, 0);

    const plan = await prisma.$transaction(async (tx) => {
      await tx.purchasePlanItem.deleteMany({ where: { planId: id } });
      return tx.purchasePlan.update({
        where: { id },
        data: {
          totalQty,
          remark,
          items: {
            create: items.map((i: any) => ({
              sparePartId: i.sparePartId,
              planQty: i.planQty,
              unitPrice: i.unitPrice || 0,
              remark: i.remark,
            })),
          },
        },
        include: { items: true },
      });
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'PURCHASE_PLAN',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `更新采购计划 ${existing.planNo} 明细`,
      ipAddress: req.ip,
    });

    success(res, plan, '采购计划更新成功');
  } catch (err: any) {
    error(res, `更新采购计划失败: ${err.message}`, 500);
  }
};

export const submitPurchasePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.purchasePlan.findUnique({ where: { id } });
    if (!existing) {
      error(res, '采购计划不存在', 404);
      return;
    }
    if (existing.status !== PurchasePlanStatus.DRAFT) {
      error(res, '只能提交草稿状态的采购计划', 400);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== existing.storeId) {
      error(res, '无权提交其他门店的采购计划', 403);
      return;
    }
    if (existing.createdById !== req.user!.userId && req.user?.role !== Role.ADMIN) {
      error(res, '只能提交自己创建的采购计划', 403);
      return;
    }

    const plan = await prisma.purchasePlan.update({
      where: { id },
      data: {
        status: PurchasePlanStatus.SUBMITTED,
        submittedById: req.user!.userId,
        submittedAt: new Date(),
      },
    });

    await logOperation({
      action: LogAction.STATUS_CHANGE,
      module: 'PURCHASE_PLAN',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `提交采购计划 ${existing.planNo}`,
      ipAddress: req.ip,
    });

    success(res, plan, '采购计划已提交');
  } catch (err: any) {
    error(res, `提交采购计划失败: ${err.message}`, 500);
  }
};

export const approvePurchasePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.purchasePlan.findUnique({ where: { id } });
    if (!existing) {
      error(res, '采购计划不存在', 404);
      return;
    }
    if (existing.status !== PurchasePlanStatus.SUBMITTED) {
      error(res, '只能审批已提交状态的采购计划', 400);
      return;
    }

    const plan = await prisma.purchasePlan.update({
      where: { id },
      data: {
        status: PurchasePlanStatus.APPROVED,
        approvedById: req.user!.userId,
        approvedAt: new Date(),
      },
    });

    await logOperation({
      action: LogAction.APPROVE,
      module: 'PURCHASE_PLAN',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `批准采购计划 ${existing.planNo}`,
      ipAddress: req.ip,
    });

    success(res, plan, '采购计划已批准');
  } catch (err: any) {
    error(res, `审批采购计划失败: ${err.message}`, 500);
  }
};

export const rejectPurchasePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rejectReason } = req.body;
    const existing = await prisma.purchasePlan.findUnique({ where: { id } });
    if (!existing) {
      error(res, '采购计划不存在', 404);
      return;
    }
    if (existing.status !== PurchasePlanStatus.SUBMITTED) {
      error(res, '只能驳回已提交状态的采购计划', 400);
      return;
    }

    const plan = await prisma.purchasePlan.update({
      where: { id },
      data: {
        status: PurchasePlanStatus.REJECTED,
        rejectedById: req.user!.userId,
        rejectedAt: new Date(),
        rejectReason,
      },
    });

    await logOperation({
      action: LogAction.REJECT,
      module: 'PURCHASE_PLAN',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `驳回采购计划 ${existing.planNo}，原因：${rejectReason || '未说明'}`,
      ipAddress: req.ip,
    });

    success(res, plan, '采购计划已驳回');
  } catch (err: any) {
    error(res, `驳回采购计划失败: ${err.message}`, 500);
  }
};

export const cancelPurchasePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { cancelReason } = req.body;
    const existing = await prisma.purchasePlan.findUnique({ where: { id } });
    if (!existing) {
      error(res, '采购计划不存在', 404);
      return;
    }
    const allowedCancelStatuses = [PurchasePlanStatus.DRAFT, PurchasePlanStatus.SUBMITTED, PurchasePlanStatus.APPROVED];
    if (!allowedCancelStatuses.includes(existing.status as any)) {
      error(res, '当前状态无法取消采购计划', 400);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== existing.storeId) {
      error(res, '无权取消其他门店的采购计划', 403);
      return;
    }

    const hasReceipts = await prisma.purchaseReceipt.count({
      where: { planId: id, status: PurchaseReceiptStatus.CONFIRMED },
    });
    if (hasReceipts > 0) {
      error(res, '已有确认入库记录，无法取消', 400);
      return;
    }

    const plan = await prisma.purchasePlan.update({
      where: { id },
      data: {
        status: PurchasePlanStatus.CANCELLED,
        cancelledById: req.user!.userId,
        cancelledAt: new Date(),
        cancelReason,
      },
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'PURCHASE_PLAN',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `取消采购计划 ${existing.planNo}，原因：${cancelReason || '未说明'}`,
      ipAddress: req.ip,
    });

    success(res, plan, '采购计划已取消');
  } catch (err: any) {
    error(res, `取消采购计划失败: ${err.message}`, 500);
  }
};

export const createPurchaseReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planId, items, remark } = req.body;
    if (!planId || !Array.isArray(items) || items.length === 0) {
      error(res, '请填写采购计划和入库明细', 400);
      return;
    }

    const plan = await prisma.purchasePlan.findUnique({
      where: { id: planId },
      include: { items: true },
    });
    if (!plan) {
      error(res, '采购计划不存在', 404);
      return;
    }
    if (plan.status !== PurchasePlanStatus.APPROVED && plan.status !== PurchasePlanStatus.PARTIAL_RECEIVED) {
      error(res, '只能对已批准/部分入库的采购计划进行入库', 400);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== plan.storeId) {
      error(res, '只能入库自己门店的采购计划', 403);
      return;
    }

    for (const item of items) {
      if (!item.planItemId || !item.quantity || item.quantity <= 0) {
        error(res, '入库明细不完整', 400);
        return;
      }
      const planItem = plan.items.find(i => i.id === item.planItemId);
      if (!planItem) {
        error(res, '入库明细对应计划明细不存在', 400);
        return;
      }
      const remainingQty = planItem.planQty - planItem.receivedQty;
      if (item.quantity > remainingQty) {
        error(res, `备件 ${planItem.sparePartId} 入库数量超过剩余待入库 ${remainingQty}`, 400);
        return;
      }
    }

    const planItemIds = items.map((i: any) => i.planItemId);
    const existingReceipt = await prisma.purchaseReceipt.findFirst({
      where: {
        planId,
        status: PurchaseReceiptStatus.PENDING,
        items: { some: { planItemId: { in: planItemIds } } },
      },
    });
    if (existingReceipt) {
      error(res, `存在未确认的入库单 ${existingReceipt.receiptNo}，请先确认或取消`, 400);
      return;
    }

    const receiptNo = generateReceiptNo();
    const totalQty = items.reduce((sum: number, i: any) => sum + i.quantity, 0);

    const receipt = await prisma.purchaseReceipt.create({
      data: {
        receiptNo,
        planId,
        storeId: plan.storeId,
        status: PurchaseReceiptStatus.PENDING,
        totalQty,
        remark,
        createdById: req.user!.userId,
        items: {
          create: items.map((i: any) => {
            const planItem = plan.items.find((p: any) => p.id === i.planItemId);
            return {
              planItemId: i.planItemId,
              sparePartId: planItem!.sparePartId,
              quantity: i.quantity,
              unitPrice: i.unitPrice || planItem!.unitPrice || 0,
            };
          }),
        },
      },
      include: { items: true },
    });

    await logOperation({
      action: LogAction.CREATE,
      module: 'PURCHASE_RECEIPT',
      targetId: receipt.id,
      operatorId: req.user!.userId,
      detail: `创建入库单 ${receiptNo}，对应采购计划 ${plan.planNo}，${items.length} 个备件，${totalQty} 件`,
      ipAddress: req.ip,
    });

    success(res, receipt, '入库单创建成功，请确认入库', 201);
  } catch (err: any) {
    error(res, `创建入库单失败: ${err.message}`, 500);
  }
};

export const confirmPurchaseReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const receipt = await prisma.purchaseReceipt.findUnique({
      where: { id },
      include: {
        items: { include: { planItem: true } },
        plan: { include: { items: true } },
      },
    });
    if (!receipt) {
      error(res, '入库单不存在', 404);
      return;
    }
    if (receipt.status !== PurchaseReceiptStatus.PENDING) {
      error(res, '入库单已确认，不可重复确认', 400);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== receipt.storeId) {
      error(res, '只能确认自己门店的入库单', 403);
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        const planItem = receipt.plan.items.find((p: any) => p.id === item.planItemId);
        if (!planItem) continue;

        const remainingQty = planItem.planQty - planItem.receivedQty;
        if (item.quantity > remainingQty) {
          throw new Error(`备件入库数量超过剩余待入库数量`);
        }

        const invBefore = await tx.inventory.findUnique({
          where: { sparePartId_storeId: { sparePartId: item.sparePartId, storeId: receipt.storeId } },
        });

        const qtyBefore = invBefore ? invBefore.quantity : 0;
        const lockedBefore = invBefore ? invBefore.lockedQty : 0;
        const availBefore = invBefore ? invBefore.availableQty : 0;

        await tx.inventory.upsert({
          where: { sparePartId_storeId: { sparePartId: item.sparePartId, storeId: receipt.storeId } },
          create: {
            sparePartId: item.sparePartId,
            storeId: receipt.storeId,
            quantity: item.quantity,
            availableQty: item.quantity,
            minStock: 0,
          },
          update: {
            quantity: { increment: item.quantity },
            availableQty: { increment: item.quantity },
          },
        });

        await createInventoryLog({
          sparePartId: item.sparePartId,
          storeId: receipt.storeId,
          changeType: InventoryChangeType.PURCHASE_IN,
          quantityBefore: qtyBefore,
          quantityAfter: qtyBefore + item.quantity,
          lockedQtyBefore: lockedBefore,
          lockedQtyAfter: lockedBefore,
          availableQtyBefore: availBefore,
          availableQtyAfter: availBefore + item.quantity,
          relatedPurchasePlanId: receipt.planId,
          relatedPurchaseReceiptId: receipt.id,
          operatorId: req.user!.userId,
          remark: `采购入库 ${receipt.receiptNo}，计划 ${receipt.plan.planNo}，数量 ${item.quantity}`,
          tx,
        });

        await tx.purchasePlanItem.update({
          where: { id: item.planItemId },
          data: { receivedQty: { increment: item.quantity } },
        });
      }

      const updatedPlanItems = await tx.purchasePlanItem.findMany({ where: { planId: receipt.planId } });
      const planTotalQty = updatedPlanItems.reduce((s, p) => s + p.planQty, 0);
      const planTotalReceived = updatedPlanItems.reduce((s, p) => s + p.receivedQty, 0);
      let newPlanStatus: string;
      if (planTotalReceived >= planTotalQty) {
        newPlanStatus = PurchasePlanStatus.FULL_RECEIVED;
      } else if (planTotalReceived > 0) {
        newPlanStatus = PurchasePlanStatus.PARTIAL_RECEIVED;
      } else {
        newPlanStatus = PurchasePlanStatus.APPROVED;
      }

      await tx.purchasePlan.update({
        where: { id: receipt.planId },
        data: {
          status: newPlanStatus,
          receivedQty: planTotalReceived,
        },
      });

      return tx.purchaseReceipt.update({
        where: { id },
        data: {
          status: PurchaseReceiptStatus.CONFIRMED,
          confirmedById: req.user!.userId,
          confirmedAt: new Date(),
        },
        include: { items: true },
      });
    });

    await logOperation({
      action: LogAction.STATUS_CHANGE,
      module: 'PURCHASE_RECEIPT',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `确认入库单 ${receipt.receiptNo}，对应采购计划 ${receipt.plan.planNo}`,
      ipAddress: req.ip,
    });

    success(res, result, '入库确认成功');
  } catch (err: any) {
    error(res, `确认入库失败: ${err.message}`, 500);
  }
};

export const listPurchaseReceipts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { planId, storeId, status } = req.query;

    const where: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    } else if (storeId) {
      where.storeId = parseInt(storeId as string, 10);
    }
    if (planId) where.planId = parseInt(planId as string, 10);
    if (status) where.status = status as string;

    const [items, total] = await Promise.all([
      prisma.purchaseReceipt.findMany({
        where,
        skip,
        take,
        include: {
          plan: { select: { id: true, planNo: true, status: true } },
          store: true,
          items: { include: { sparePart: true, planItem: true } },
          createdBy: { select: { id: true, realName: true } },
          confirmedBy: { select: { id: true, realName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseReceipt.count({ where }),
    ]);

    const result = buildPaginatedResult(items, total, page, pageSize);
    success(res, result);
  } catch (err: any) {
    error(res, `获取入库单列表失败: ${err.message}`, 500);
  }
};

export const deletePurchaseReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.purchaseReceipt.findUnique({ where: { id } });
    if (!existing) {
      error(res, '入库单不存在', 404);
      return;
    }
    if (existing.status !== PurchaseReceiptStatus.PENDING) {
      error(res, '只能删除待确认状态的入库单', 400);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId && req.user.storeId !== existing.storeId) {
      error(res, '无权删除其他门店的入库单', 403);
      return;
    }

    await prisma.purchaseReceiptItem.deleteMany({ where: { receiptId: id } });
    await prisma.purchaseReceipt.delete({ where: { id } });

    await logOperation({
      action: LogAction.DELETE,
      module: 'PURCHASE_RECEIPT',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `删除入库单 ${existing.receiptNo}`,
      ipAddress: req.ip,
    });

    success(res, null, '入库单已删除');
  } catch (err: any) {
    error(res, `删除入库单失败: ${err.message}`, 500);
  }
};
