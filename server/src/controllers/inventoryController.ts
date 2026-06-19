import { Response } from 'express';
import { Role, SparePartRequestStatus, TransferStatus, LogAction, TicketStatus } from '../constants/enums';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { logOperation } from '../services/logService';

const generateRequestNo = (): string => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `SPR${dateStr}${random}`;
};

const generateTransferNo = (): string => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `TRF${dateStr}${random}`;
};

export const listInventories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { storeId, sparePartId, keyword, lowStock } = req.query;

    const where: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    } else if (storeId) {
      where.storeId = parseInt(storeId as string, 10);
    }
    if (sparePartId) where.sparePartId = parseInt(sparePartId as string, 10);
    if (keyword) {
      where.sparePart = {
        OR: [
          { partCode: { contains: keyword as string } },
          { name: { contains: keyword as string } },
        ],
      };
    }
    if (lowStock === 'true') {
      where.quantity = { lte: prisma.inventory.fields.minStock };
    }

    const [inventories, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        skip,
        take,
        include: { sparePart: true, store: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.inventory.count({ where }),
    ]);

    const result = buildPaginatedResult(inventories, total, page, pageSize);
    success(res, result);
  } catch (err: any) {
    error(res, `获取库存列表失败: ${err.message}`, 500);
  }
};

export const getInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { sparePart: true, store: true },
    });
    if (!inventory) {
      error(res, '库存记录不存在', 404);
      return;
    }
    success(res, inventory);
  } catch (err) {
    error(res, '获取库存信息失败', 500);
  }
};

export const updateInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { quantity, minStock } = req.body;
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      error(res, '库存记录不存在', 404);
      return;
    }

    const data: any = { minStock };
    if (quantity !== undefined) {
      if (quantity < existing.lockedQty) {
        error(res, `调整后数量不能小于锁定数量 ${existing.lockedQty}`, 400);
        return;
      }
      data.quantity = quantity;
      data.availableQty = quantity - existing.lockedQty;
    }

    const updated = await prisma.inventory.update({ where: { id }, data });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'INVENTORY',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `更新库存`,
      newValue: data,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, updated, '库存更新成功');
  } catch (err: any) {
    error(res, `更新库存失败: ${err.message}`, 500);
  }
};

export const checkAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sparePartId, quantity, storeId } = req.query;
    if (!sparePartId || !quantity) {
      error(res, '请提供备件ID和数量', 400);
      return;
    }
    const partId = parseInt(sparePartId as string, 10);
    const qty = parseInt(quantity as string, 10);

    const hqStore = await prisma.store.findFirst({
      where: { region: 'HQ' },
    });

    const inventories = await prisma.inventory.findMany({
      where: {
        sparePartId: partId,
        availableQty: { gte: qty },
      },
      include: { store: true },
      orderBy: { availableQty: 'desc' },
    });

    let priorityList: any[] = [];
    if (storeId) {
      const sId = parseInt(storeId as string, 10);
      const sameStore = inventories.filter((i) => i.storeId === sId);
      const others = inventories.filter((i) => i.storeId !== sId);
      priorityList = [...sameStore, ...others];
    } else if (hqStore) {
      const hq = inventories.filter((i) => i.storeId === hqStore.id);
      const others = inventories.filter((i) => i.storeId !== hqStore.id);
      priorityList = [...hq, ...others];
    } else {
      priorityList = inventories;
    }

    const totalAvailable = inventories.reduce((sum, i) => sum + i.availableQty, 0);

    success(res, {
      available: totalAvailable >= qty,
      totalAvailable,
      requestedQty: qty,
      shortage: Math.max(0, qty - totalAvailable),
      locations: priorityList.map((i) => ({
        storeId: i.storeId,
        storeName: i.store?.name,
        storeCode: i.store?.storeCode,
        region: i.store?.region,
        availableQty: i.availableQty,
        quantity: i.quantity,
      })),
    });
  } catch (err: any) {
    error(res, `检查库存失败: ${err.message}`, 500);
  }
};

export const listSparePartRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { status, ticketId, fromStoreId, toStoreId } = req.query;

    const where: any = {};
    if (status) where.status = status as SparePartRequestStatus;
    if (ticketId) where.ticketId = parseInt(ticketId as string, 10);
    if (fromStoreId) where.fromStoreId = parseInt(fromStoreId as string, 10);
    if (toStoreId) where.toStoreId = parseInt(toStoreId as string, 10);

    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.toStoreId = req.user.storeId;
    }

    const [requests, total] = await Promise.all([
      prisma.sparePartRequest.findMany({
        where,
        skip,
        take,
        include: {
          ticket: { select: { ticketNo: true } },
          sparePart: true,
          fromStore: true,
          toStore: true,
          requestedBy: { select: { id: true, realName: true } },
          transfers: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sparePartRequest.count({ where }),
    ]);

    const result = buildPaginatedResult(requests, total, page, pageSize);
    success(res, result);
  } catch (err: any) {
    error(res, `获取备件申请列表失败: ${err.message}`, 500);
  }
};

export const getSparePartRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await prisma.sparePartRequest.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        ticket: true,
        sparePart: true,
        fromStore: true,
        toStore: true,
        requestedBy: { select: { id: true, realName: true } },
        approvedBy: { select: { id: true, realName: true } },
        transfers: { include: { fromStore: true, toStore: true, operator: { select: { realName: true } } } },
      },
    });
    if (!request) {
      error(res, '备件申请不存在', 404);
      return;
    }
    success(res, request);
  } catch (err) {
    error(res, '获取备件申请详情失败', 500);
  }
};

export const createSparePartRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ticketId, sparePartId, requestQty, fromStoreId, remark } = req.body;

    const ticket = await prisma.repairTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      error(res, '工单不存在', 404);
      return;
    }
    if (req.user?.role === Role.TECHNICIAN && ticket.assignedToId !== req.user.userId) {
      error(res, '只能为自己负责的工单申请备件', 403);
      return;
    }
    if (!([TicketStatus.DIAGNOSING, TicketStatus.WAITING_SPARE_PARTS, TicketStatus.REPAIRING] as string[]).includes(ticket.status)) {
      error(res, `当前工单状态 ${ticket.status} 不可申请备件`, 400);
      return;
    }

    const part = await prisma.sparePart.findUnique({ where: { id: sparePartId } });
    if (!part) {
      error(res, '备件不存在', 404);
      return;
    }

    const sourceStoreId = fromStoreId;
    let sourceInventory: any = null;
    if (sourceStoreId) {
      sourceInventory = await prisma.inventory.findUnique({
        where: { sparePartId_storeId: { sparePartId, storeId: sourceStoreId } },
      });
      if (!sourceInventory || sourceInventory.availableQty < requestQty) {
        error(res, '所选门店库存不足', 400);
        return;
      }
    }

    const requestNo = generateRequestNo();
    const created = await prisma.$transaction(async (tx) => {
      const result = await tx.sparePartRequest.create({
        data: {
          requestNo,
          ticketId,
          sparePartId,
          requestQty,
          status: SparePartRequestStatus.PENDING,
          fromStoreId: sourceStoreId,
          toStoreId: ticket.storeId,
          requestedById: req.user!.userId,
          remark,
        },
      });

      if (sourceInventory && sourceStoreId) {
        await tx.inventory.update({
          where: { id: sourceInventory.id },
          data: {
            lockedQty: { increment: requestQty },
            availableQty: { decrement: requestQty },
          },
        });
      }

      if (ticket.status === TicketStatus.DIAGNOSING) {
        await tx.repairTicket.update({
          where: { id: ticketId },
          data: { status: TicketStatus.WAITING_SPARE_PARTS },
        });
      }

      return result;
    });

    await logOperation({
      action: LogAction.CREATE,
      module: 'SPARE_PART_REQUEST',
      targetId: created.id,
      operatorId: req.user!.userId,
      detail: `创建备件申请: ${requestNo}`,
      newValue: { ticketId, sparePartId, requestQty, fromStoreId },
      ipAddress: req.ip,
    });

    success(res, created, '备件申请创建成功', 201);
  } catch (err: any) {
    error(res, `创建备件申请失败: ${err.message}`, 500);
  }
};

export const updateSparePartRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, remark, fulfilledQty } = req.body;

    const existing = await prisma.sparePartRequest.findUnique({ where: { id }, include: { ticket: true } });
    if (!existing) {
      error(res, '备件申请不存在', 404);
      return;
    }
    if (existing.status === SparePartRequestStatus.CANCELLED || existing.status === SparePartRequestStatus.FULL_FULFILLED) {
      error(res, '该申请已完成或取消，无法变更', 400);
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const data: any = {
        status,
        remark,
        approvedById: req.user!.userId,
      };
      if (fulfilledQty !== undefined) {
        data.fulfilledQty = Math.min(existing.requestQty, Math.max(0, fulfilledQty));
        if (data.fulfilledQty === existing.requestQty) {
          data.status = SparePartRequestStatus.FULL_FULFILLED;
        } else if (data.fulfilledQty > 0) {
          data.status = SparePartRequestStatus.PARTIAL_FULFILLED;
        }
      }

      const result = await tx.sparePartRequest.update({ where: { id }, data });

      if (status === SparePartRequestStatus.REJECTED && existing.fromStoreId) {
        await tx.inventory.update({
          where: { sparePartId_storeId: { sparePartId: existing.sparePartId, storeId: existing.fromStoreId } },
          data: {
            lockedQty: { decrement: existing.requestQty },
            availableQty: { increment: existing.requestQty },
          },
        });
      }

      if (status === SparePartRequestStatus.BACKORDER) {
        if (existing.fromStoreId) {
          await tx.inventory.update({
            where: { sparePartId_storeId: { sparePartId: existing.sparePartId, storeId: existing.fromStoreId } },
            data: {
              lockedQty: { decrement: existing.requestQty },
              availableQty: { increment: existing.requestQty },
            },
          });
        }
      }

      return result;
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'SPARE_PART_REQUEST',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `备件申请 ${existing.requestNo} 状态更新为 ${status}`,
      newValue: req.body,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, updated, '备件申请更新成功');
  } catch (err: any) {
    error(res, `更新备件申请失败: ${err.message}`, 500);
  }
};

export const cancelSparePartRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { remark } = req.body;

    const existing = await prisma.sparePartRequest.findUnique({ where: { id }, include: { ticket: true } });
    if (!existing) {
      error(res, '备件申请不存在', 404);
      return;
    }
    if (([SparePartRequestStatus.FULL_FULFILLED, SparePartRequestStatus.CANCELLED] as string[]).includes(existing.status)) {
      error(res, '该申请无法取消', 400);
    }
    if (req.user?.role !== Role.ADMIN && req.user?.userId !== existing.requestedById) {
      error(res, '只能取消自己创建的申请', 403);
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.sparePartRequest.update({
        where: { id },
        data: { status: SparePartRequestStatus.CANCELLED, remark },
      });

      if (existing.fromStoreId && existing.status !== SparePartRequestStatus.REJECTED) {
        const releaseQty = existing.requestQty - existing.fulfilledQty;
        if (releaseQty > 0) {
          await tx.inventory.update({
            where: { sparePartId_storeId: { sparePartId: existing.sparePartId, storeId: existing.fromStoreId } },
            data: {
              lockedQty: { decrement: releaseQty },
              availableQty: { increment: releaseQty },
            },
          });
        }
      }
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'SPARE_PART_REQUEST',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `取消备件申请: ${existing.requestNo}`,
      ipAddress: req.ip,
    });

    success(res, null, '备件申请已取消');
  } catch (err: any) {
    error(res, `取消备件申请失败: ${err.message}`, 500);
  }
};

export const listTransfers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { status, fromStoreId, toStoreId, requestId } = req.query;

    const where: any = {};
    if (status) where.status = status as TransferStatus;
    if (fromStoreId) where.fromStoreId = parseInt(fromStoreId as string, 10);
    if (toStoreId) where.toStoreId = parseInt(toStoreId as string, 10);
    if (requestId) where.requestId = parseInt(requestId as string, 10);

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        skip,
        take,
        include: {
          sparePart: true,
          fromStore: true,
          toStore: true,
          request: { select: { requestNo: true } },
          operator: { select: { id: true, realName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transfer.count({ where }),
    ]);

    const result = buildPaginatedResult(transfers, total, page, pageSize);
    success(res, result);
  } catch (err: any) {
    error(res, `获取调拨列表失败: ${err.message}`, 500);
  }
};

export const createTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestId, sparePartId, fromStoreId, toStoreId, quantity, remark } = req.body;

    if (fromStoreId === toStoreId) {
      error(res, '调出和调入门店不能相同', 400);
      return;
    }

    const sourceInventory = await prisma.inventory.findUnique({
      where: { sparePartId_storeId: { sparePartId, storeId: fromStoreId } },
    });
    if (!sourceInventory || sourceInventory.availableQty + sourceInventory.lockedQty < quantity) {
      error(res, '调出门店库存不足', 400);
      return;
    }

    const transferNo = generateTransferNo();
    const created = await prisma.$transaction(async (tx) => {
      const result = await tx.transfer.create({
        data: {
          transferNo,
          requestId,
          sparePartId,
          fromStoreId,
          toStoreId,
          quantity,
          operatorId: req.user!.userId,
          remark,
        },
      });

      const useLocked = Math.min(sourceInventory.lockedQty, quantity);
      const useAvailable = quantity - useLocked;
      await tx.inventory.update({
        where: { id: sourceInventory.id },
        data: {
          quantity: { decrement: quantity },
          lockedQty: useLocked > 0 ? { decrement: useLocked } : undefined,
          availableQty: useAvailable > 0 ? { decrement: useAvailable } : undefined,
        },
      });

      return result;
    });

    await logOperation({
      action: LogAction.TRANSFER,
      module: 'INVENTORY_TRANSFER',
      targetId: created.id,
      operatorId: req.user!.userId,
      detail: `创建调拨单: ${transferNo}`,
      newValue: req.body,
      ipAddress: req.ip,
    });

    success(res, created, '调拨单创建成功', 201);
  } catch (err: any) {
    error(res, `创建调拨单失败: ${err.message}`, 500);
  }
};

export const updateTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, remark } = req.body;

    const existing = await prisma.transfer.findUnique({ where: { id } });
    if (!existing) {
      error(res, '调拨单不存在', 404);
      return;
    }
    if (existing.status === TransferStatus.RECEIVED || existing.status === TransferStatus.CANCELLED) {
      error(res, '该调拨单已完成或取消，无法变更', 400);
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const data: any = { status, remark };
      if (status === TransferStatus.IN_TRANSIT) {
        data.shippedAt = new Date();
      }
      if (status === TransferStatus.CANCELLED) {
        await tx.inventory.upsert({
          where: { sparePartId_storeId: { sparePartId: existing.sparePartId, storeId: existing.fromStoreId } },
          create: {
            sparePartId: existing.sparePartId,
            storeId: existing.fromStoreId,
            quantity: existing.quantity,
            availableQty: existing.quantity,
          },
          update: {
            quantity: { increment: existing.quantity },
            availableQty: { increment: existing.quantity },
          },
        });
      }
      return tx.transfer.update({ where: { id }, data });
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'INVENTORY_TRANSFER',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `调拨单 ${existing.transferNo} 状态更新为 ${status}`,
      newValue: req.body,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, updated, '调拨单更新成功');
  } catch (err: any) {
    error(res, `更新调拨单失败: ${err.message}`, 500);
  }
};

export const receiveTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { remark } = req.body;

    const existing = await prisma.transfer.findUnique({
      where: { id },
      include: { request: true },
    });
    if (!existing) {
      error(res, '调拨单不存在', 404);
      return;
    }
    if (existing.status !== TransferStatus.IN_TRANSIT && existing.status !== TransferStatus.PENDING) {
      error(res, `当前状态 ${existing.status} 不可收货`, 400);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId !== existing.toStoreId) {
      error(res, '只能接收调入本门店的调拨', 403);
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.inventory.upsert({
        where: { sparePartId_storeId: { sparePartId: existing.sparePartId, storeId: existing.toStoreId } },
        create: {
          sparePartId: existing.sparePartId,
          storeId: existing.toStoreId,
          quantity: existing.quantity,
          availableQty: existing.quantity,
        },
        update: {
          quantity: { increment: existing.quantity },
          availableQty: { increment: existing.quantity },
        },
      });

      const result = await tx.transfer.update({
        where: { id },
        data: { status: TransferStatus.RECEIVED, receivedAt: new Date(), remark },
      });

      if (existing.requestId) {
        const req_1 = await tx.sparePartRequest.findUnique({ where: { id: existing.requestId } });
        if (req_1) {
          const newFulfilled = Math.min(req_1.requestQty, req_1.fulfilledQty + existing.quantity);
          const newStatus = newFulfilled === req_1.requestQty
            ? SparePartRequestStatus.FULL_FULFILLED
            : newFulfilled > 0
              ? SparePartRequestStatus.PARTIAL_FULFILLED
              : req_1.status;
          await tx.sparePartRequest.update({
            where: { id: existing.requestId },
            data: { fulfilledQty: newFulfilled, status: newStatus },
          });
        }
      }

      return result;
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'INVENTORY_TRANSFER',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `调拨单 ${existing.transferNo} 已收货`,
      ipAddress: req.ip,
    });

    success(res, updated, '收货成功');
  } catch (err: any) {
    error(res, `收货失败: ${err.message}`, 500);
  }
};
