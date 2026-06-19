import { Response } from 'express';
import { createObjectCsvStringifier } from 'csv-writer';
import { TicketStatus, Role, LogAction, toJsonArray, parseJsonArray } from '../constants/enums';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { logOperation } from '../services/logService';
import {
  canTransition,
  canUserTransition,
  recommendTechnicians as recommendTechs,
  calculateSlaDeadline,
  generateTicketNo,
  findDuplicateTicket,
} from '../services/ticketService';

export const listTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { status, urgency, storeId, assignedToId, equipmentId, keyword, dateFrom, dateTo } = req.query;

    const where: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    } else if (storeId) {
      where.storeId = parseInt(storeId as string, 10);
    }
    if (req.user?.role === Role.TECHNICIAN) {
      where.assignedToId = req.user.userId;
    } else if (assignedToId) {
      where.assignedToId = parseInt(assignedToId as string, 10);
    }
    if (status) where.status = status as TicketStatus;
    if (urgency) where.urgency = urgency as any;
    if (equipmentId) where.equipmentId = parseInt(equipmentId as string, 10);
    if (keyword) {
      where.OR = [
        { ticketNo: { contains: keyword as string } },
        { description: { contains: keyword as string } },
        { faultType: { contains: keyword as string } },
      ];
    }
    if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom as string) };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo as string) };

    const [tickets, total] = await Promise.all([
      prisma.repairTicket.findMany({
        where,
        skip,
        take,
        include: {
          equipment: true,
          store: true,
          createdBy: { select: { id: true, realName: true, username: true } },
          assignedTo: { select: { id: true, realName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.repairTicket.count({ where }),
    ]);

    const result = buildPaginatedResult(
      tickets.map(t => ({ ...t, imageUrls: parseJsonArray(t.imageUrls) })),
      total, page, pageSize
    );
    success(res, result);
  } catch (err: any) {
    error(res, `获取工单列表失败: ${err.message}`, 500);
  }
};

export const getTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await prisma.repairTicket.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        equipment: true,
        store: true,
        createdBy: { select: { id: true, realName: true, username: true } },
        assignedTo: { select: { id: true, realName: true, username: true, technician: true } },
        statusHistory: {
          include: { operator: { select: { id: true, realName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        sparePartRequests: {
          include: {
            sparePart: true,
            fromStore: true,
            toStore: true,
            requestedBy: { select: { id: true, realName: true } },
            transfers: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        mergedTicket: true,
        mergedChildren: true,
      },
    });
    if (!ticket) {
      error(res, '工单不存在', 404);
      return;
    }
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId !== ticket.storeId) {
      error(res, '权限不足', 403);
      return;
    }
    if (req.user?.role === Role.TECHNICIAN && req.user.userId !== ticket.assignedToId) {
      error(res, '权限不足', 403);
      return;
    }
    success(res, { ...ticket, imageUrls: parseJsonArray(ticket.imageUrls) });
  } catch (err: any) {
    error(res, `获取工单详情失败: ${err.message}`, 500);
  }
};

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { equipmentId, faultType, description, imageUrls, urgency, expectedTime } = req.body;

    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: { store: true },
    });
    if (!equipment) {
      error(res, '设备不存在', 404);
      return;
    }

    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId !== equipment.storeId) {
      error(res, '只能为所在门店的设备提交工单', 403);
      return;
    }

    const duplicate = await findDuplicateTicket(equipmentId, faultType, description);
    if (duplicate) {
      error(res, `检测到相似工单（工单号: ${duplicate.ticketNo}），请确认是否重复报修`, 409);
      return;
    }

    const ticketNo = generateTicketNo();
    const now = new Date();
    const slaDeadline = await calculateSlaDeadline(urgency, now);

    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNo,
        equipmentId,
        storeId: equipment.storeId,
        faultType,
        description,
        imageUrls: toJsonArray(imageUrls || []),
        urgency,
        expectedTime: expectedTime ? new Date(expectedTime) : undefined,
        status: TicketStatus.CREATED,
        createdById: req.user!.userId,
        slaDeadline,
      },
      include: {
        equipment: true,
        store: true,
        createdBy: { select: { id: true, realName: true } },
      },
    });

    await prisma.statusHistory.create({
      data: {
        ticketId: ticket.id,
        toStatus: TicketStatus.CREATED,
        operatorId: req.user!.userId,
        remark: '创建工单',
      },
    });

    await logOperation({
      action: LogAction.CREATE,
      module: 'TICKET',
      targetId: ticket.id,
      targetType: 'RepairTicket',
      operatorId: req.user!.userId,
      detail: `创建工单: ${ticketNo}`,
      newValue: { ticketNo, equipmentId, faultType, urgency },
      ipAddress: req.ip,
    });

    success(res, ticket, '工单创建成功', 201);
  } catch (err: any) {
    error(res, `创建工单失败: ${err.message}`, 500);
  }
};

export const recommendTechnicians = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { equipmentId, urgency } = req.query;
    if (!equipmentId) {
      error(res, '请提供设备ID', 400);
      return;
    }
    const equipment = await prisma.equipment.findUnique({
      where: { id: parseInt(equipmentId as string, 10) },
      include: { store: true },
    });
    if (!equipment) {
      error(res, '设备不存在', 404);
      return;
    }
    const ticket = await prisma.repairTicket.findFirst({ where: { equipmentId: equipment.id } });
    const faultType = ticket?.faultType || '通用维修';
    const techs = await recommendTechs(equipment.store.region, faultType, (urgency as any) || 'MEDIUM');
    success(res, techs);
  } catch (err: any) {
    error(res, `获取推荐维修员失败: ${err.message}`, 500);
  }
};

export const assignTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { technicianId, remark } = req.body;

    const ticket = await prisma.repairTicket.findUnique({ where: { id } });
    if (!ticket) {
      error(res, '工单不存在', 404);
      return;
    }
    if (!([TicketStatus.CREATED, TicketStatus.REJECTED_BY_TECHNICIAN, TicketStatus.ESCALATED] as string[]).includes(ticket.status)) {
      error(res, `当前状态 ${ticket.status} 不可派单`, 400);
      return;
    }

    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      include: { technician: true },
    });
    if (!technician || technician.role !== Role.TECHNICIAN || !technician.isActive) {
      error(res, '维修员不存在或不可用', 400);
      return;
    }
    if (technician.technician && technician.technician.currentLoad >= technician.technician.maxLoad) {
      error(res, '该维修员当前负载已满', 400);
      return;
    }

    const oldAssignedToId = ticket.assignedToId;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.repairTicket.update({
        where: { id },
        data: {
          assignedToId: technicianId,
          status: TicketStatus.ASSIGNED,
        },
        include: { assignedTo: { select: { id: true, realName: true } } },
      });

      await tx.statusHistory.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: TicketStatus.ASSIGNED,
          operatorId: req.user!.userId,
          remark: remark || `派单给 ${technician.realName}`,
        },
      });

      if (oldAssignedToId && oldAssignedToId !== technicianId) {
        await tx.technicianProfile.update({
          where: { userId: oldAssignedToId },
          data: { currentLoad: { decrement: 1 } },
        });
      }
      await tx.technicianProfile.update({
        where: { userId: technicianId },
        data: { currentLoad: { increment: 1 } },
      });

      return updatedTicket;
    });

    await logOperation({
      action: LogAction.ASSIGN,
      module: 'TICKET',
      targetId: id,
      targetType: 'RepairTicket',
      operatorId: req.user!.userId,
      detail: `工单 ${ticket.ticketNo} 派单给 ${technician.realName}`,
      newValue: { technicianId },
      oldValue: { assignedToId: oldAssignedToId },
      ipAddress: req.ip,
    });

    success(res, updated, '派单成功');
  } catch (err: any) {
    error(res, `派单失败: ${err.message}`, 500);
  }
};

export const updateTicketStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, remark, diagnosis, repairResult, rejectReason } = req.body;

    const ticket = await prisma.repairTicket.findUnique({ where: { id } });
    if (!ticket) {
      error(res, '工单不存在', 404);
      return;
    }

    if (!canTransition(ticket.status, status)) {
      error(res, `不允许从 ${ticket.status} 转换到 ${status}`, 400);
      return;
    }

    if (!canUserTransition(
      req.user!.role,
      ticket.status,
      status,
      req.user!.userId,
      ticket.assignedToId,
      ticket.storeId,
      req.user!.storeId || null
    )) {
      error(res, '权限不足，无法执行此状态变更', 403);
      return;
    }

    const updateData: any = { status };
    if (diagnosis) updateData.diagnosis = diagnosis;
    if (repairResult) updateData.repairResult = repairResult;
    if (rejectReason) updateData.rejectReason = rejectReason;

    if (status === TicketStatus.TECHNICIAN_ON_WAY && !ticket.arrivedAt) {
      updateData.arrivedAt = new Date();
    }
    if ([TicketStatus.COMPLETED, TicketStatus.CANNOT_REPAIR].includes(status) && !ticket.completedAt) {
      updateData.completedAt = new Date();
    }
    if (status === TicketStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.repairTicket.update({
        where: { id },
        data: updateData,
      });

      await tx.statusHistory.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: status,
          operatorId: req.user!.userId,
          remark,
        },
      });

      if ([TicketStatus.ACCEPTED, TicketStatus.REJECTED, TicketStatus.CANCELLED, TicketStatus.MERGED].includes(status)
        && ticket.assignedToId) {
        await tx.technicianProfile.update({
          where: { userId: ticket.assignedToId },
          data: {
            currentLoad: { decrement: 1 },
            completedCount: status === TicketStatus.ACCEPTED ? { increment: 1 } : undefined,
          },
        });
      }

      return result;
    });

    await logOperation({
      action: LogAction.STATUS_CHANGE,
      module: 'TICKET',
      targetId: id,
      targetType: 'RepairTicket',
      operatorId: req.user!.userId,
      detail: `工单 ${ticket.ticketNo} 状态从 ${ticket.status} 变更为 ${status}`,
      newValue: { status, remark, diagnosis, repairResult },
      oldValue: { status: ticket.status },
      ipAddress: req.ip,
    });

    success(res, updated, '状态更新成功');
  } catch (err: any) {
    error(res, `状态更新失败: ${err.message}`, 500);
  }
};

export const rejectTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { remark } = req.body;

    const ticket = await prisma.repairTicket.findUnique({ where: { id } });
    if (!ticket) {
      error(res, '工单不存在', 404);
      return;
    }
    if (ticket.status !== TicketStatus.ASSIGNED) {
      error(res, '只有已派单状态可以拒单', 400);
      return;
    }
    if (req.user?.role !== Role.TECHNICIAN || req.user.userId !== ticket.assignedToId) {
      error(res, '只有被指派的维修员可以拒单', 403);
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.repairTicket.update({
        where: { id },
        data: { status: TicketStatus.REJECTED_BY_TECHNICIAN, rejectReason: remark },
      });

      await tx.statusHistory.create({
        data: {
          ticketId: id,
          fromStatus: TicketStatus.ASSIGNED,
          toStatus: TicketStatus.REJECTED_BY_TECHNICIAN,
          operatorId: req.user!.userId,
          remark: remark || '维修员拒单',
        },
      });

      if (ticket.assignedToId) {
        await tx.technicianProfile.update({
          where: { userId: ticket.assignedToId },
          data: { currentLoad: { decrement: 1 } },
        });
      }

      return result;
    });

    await logOperation({
      action: LogAction.REJECT,
      module: 'TICKET',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `维修员拒单: ${ticket.ticketNo}`,
      newValue: { remark },
      ipAddress: req.ip,
    });

    success(res, updated, '拒单成功');
  } catch (err: any) {
    error(res, `拒单失败: ${err.message}`, 500);
  }
};

export const mergeTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { targetTicketId, remark } = req.body;

    if (id === targetTicketId) {
      error(res, '不能合并到自己', 400);
      return;
    }

    const [source, target] = await Promise.all([
      prisma.repairTicket.findUnique({ where: { id } }),
      prisma.repairTicket.findUnique({ where: { id: targetTicketId } }),
    ]);

    if (!source || !target) {
      error(res, '工单不存在', 404);
      return;
    }
    if (source.equipmentId !== target.equipmentId) {
      error(res, '只能合并相同设备的工单', 400);
      return;
    }
    if (([TicketStatus.MERGED, TicketStatus.CANCELLED, TicketStatus.ACCEPTED] as string[]).includes(source.status)) {
      error(res, '当前工单状态不可合并', 400);
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.repairTicket.update({
        where: { id },
        data: {
          status: TicketStatus.MERGED,
          mergedTicketId: targetTicketId,
        },
      });

      await tx.statusHistory.create({
        data: {
          ticketId: id,
          fromStatus: source.status,
          toStatus: TicketStatus.MERGED,
          operatorId: req.user!.userId,
          remark: remark || `合并到工单 ${target.ticketNo}`,
        },
      });

      if (source.assignedToId) {
        await tx.technicianProfile.update({
          where: { userId: source.assignedToId },
          data: { currentLoad: { decrement: 1 } },
        });
      }

      return result;
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'TICKET',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `工单 ${source.ticketNo} 合并到 ${target.ticketNo}`,
      newValue: { targetTicketId },
      ipAddress: req.ip,
    });

    success(res, updated, '合并成功');
  } catch (err: any) {
    error(res, `合并工单失败: ${err.message}`, 500);
  }
};

export const exportTicketsCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, dateFrom, dateTo } = req.query;
    const where: any = {};
    if (status) where.status = status as TicketStatus;
    if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom as string) };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo as string) };

    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    }

    const tickets = await prisma.repairTicket.findMany({
      where,
      include: {
        equipment: true,
        store: true,
        createdBy: { select: { realName: true } },
        assignedTo: { select: { realName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'ticketNo', title: '工单号' },
        { id: 'storeName', title: '门店' },
        { id: 'equipmentCode', title: '设备编号' },
        { id: 'equipmentName', title: '设备名称' },
        { id: 'faultType', title: '故障类型' },
        { id: 'description', title: '故障描述' },
        { id: 'urgency', title: '紧急程度' },
        { id: 'status', title: '状态' },
        { id: 'createdBy', title: '创建人' },
        { id: 'assignedTo', title: '维修员' },
        { id: 'createdAt', title: '创建时间' },
        { id: 'completedAt', title: '完成时间' },
      ],
    });

    const records = tickets.map((t) => ({
      ticketNo: t.ticketNo,
      storeName: t.store?.name || '',
      equipmentCode: t.equipment?.equipmentCode || '',
      equipmentName: t.equipment?.name || '',
      faultType: t.faultType,
      description: t.description,
      urgency: t.urgency,
      status: t.status,
      createdBy: t.createdBy?.realName || '',
      assignedTo: t.assignedTo?.realName || '',
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() || '',
    }));

    const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tickets_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);

    await logOperation({
      action: LogAction.EXPORT,
      module: 'TICKET',
      operatorId: req.user!.userId,
      detail: `导出工单CSV，共${tickets.length}条`,
      ipAddress: req.ip,
    });
  } catch (err: any) {
    error(res, `导出失败: ${err.message}`, 500);
  }
};
