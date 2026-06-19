import { Response } from 'express';
import { TicketStatus, Role } from '@prisma/client';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticketWhere: any = {};
    const inventoryWhere: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      ticketWhere.storeId = req.user.storeId;
      inventoryWhere.storeId = req.user.storeId;
    }
    if (req.user?.role === Role.TECHNICIAN) {
      ticketWhere.assignedToId = req.user.userId;
    }

    const [totalTickets, openTickets, todayTickets, completedToday, overdue, pendingRequests, lowStockItems] =
      await Promise.all([
        prisma.repairTicket.count({ where: ticketWhere }),
        prisma.repairTicket.count({
          where: {
            ...ticketWhere,
            status: {
              in: [
                TicketStatus.CREATED,
                TicketStatus.ASSIGNED,
                TicketStatus.TECHNICIAN_ON_WAY,
                TicketStatus.DIAGNOSING,
                TicketStatus.WAITING_SPARE_PARTS,
                TicketStatus.REPAIRING,
              ],
            },
          },
        }),
        prisma.repairTicket.count({
          where: {
            ...ticketWhere,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        prisma.repairTicket.count({
          where: {
            ...ticketWhere,
            status: TicketStatus.ACCEPTED,
            acceptedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        prisma.repairTicket.count({
          where: {
            ...ticketWhere,
            slaDeadline: { lte: new Date() },
            status: {
              in: [
                TicketStatus.CREATED,
                TicketStatus.ASSIGNED,
                TicketStatus.REJECTED_BY_TECHNICIAN,
              ],
            },
          },
        }),
        prisma.sparePartRequest.count({
          where: { status: { in: ['PENDING', 'APPROVED', 'PARTIAL_FULFILLED'] } },
        }),
        prisma.inventory.count({
          where: { ...inventoryWhere, quantity: { lte: prisma.inventory.fields.minStock } },
        }),
      ]);

    success(res, {
      totalTickets,
      openTickets,
      todayTickets,
      completedToday,
      overdue,
      pendingRequests,
      lowStockItems,
    });
  } catch (err: any) {
    error(res, `获取统计数据失败: ${err.message}`, 500);
  }
};

export const getTicketTrend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const tickets = await prisma.repairTicket.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
    });

    const dailyStats: Record<string, { created: number; completed: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      dailyStats[key] = { created: 0, completed: 0 };
    }

    tickets.forEach((t) => {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (dailyStats[key]) dailyStats[key].created++;
      if (t.status === TicketStatus.ACCEPTED) {
        if (dailyStats[key]) dailyStats[key].completed++;
      }
    });

    success(res, Object.entries(dailyStats).map(([date, v]) => ({ date, ...v })));
  } catch (err: any) {
    error(res, `获取趋势数据失败: ${err.message}`, 500);
  }
};

export const getTicketsByStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const where: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    }
    if (req.user?.role === Role.TECHNICIAN) {
      where.assignedToId = req.user.userId;
    }

    const tickets = await prisma.repairTicket.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    success(res, tickets.map((t) => ({ status: t.status, count: t._count })));
  } catch (err: any) {
    error(res, `获取状态统计失败: ${err.message}`, 500);
  }
};

export const getTicketsByUrgency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const where: any = {};
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    }
    if (req.user?.role === Role.TECHNICIAN) {
      where.assignedToId = req.user.userId;
    }

    const tickets = await prisma.repairTicket.groupBy({
      by: ['urgency'],
      where,
      _count: true,
    });

    success(res, tickets.map((t) => ({ urgency: t.urgency, count: t._count })));
  } catch (err: any) {
    error(res, `获取紧急程度统计失败: ${err.message}`, 500);
  }
};

export const getStoreStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stores = await prisma.store.findMany({
      include: {
        _count: { select: { equipments: true, tickets: true } },
        tickets: {
          where: { status: TicketStatus.ACCEPTED },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    success(
      res,
      stores.map((s) => ({
        id: s.id,
        storeCode: s.storeCode,
        name: s.name,
        region: s.region,
        equipmentCount: s._count.equipments,
        totalTickets: s._count.tickets,
        completedTickets: s.tickets.length,
      }))
    );
  } catch (err: any) {
    error(res, `获取门店统计失败: ${err.message}`, 500);
  }
};

export const getTechnicianStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const techs = await prisma.user.findMany({
      where: { role: Role.TECHNICIAN, isActive: true },
      include: {
        technician: true,
        assignedTickets: {
          where: { status: { in: [TicketStatus.ACCEPTED, TicketStatus.COMPLETED, TicketStatus.CANNOT_REPAIR] } },
          select: { id: true, status: true },
        },
      },
    });

    success(
      res,
      techs.map((t) => ({
        id: t.id,
        realName: t.realName,
        username: t.username,
        currentLoad: t.technician?.currentLoad || 0,
        maxLoad: t.technician?.maxLoad || 0,
        completedCount: t.technician?.completedCount || 0,
        rating: t.technician?.rating || 0,
        skills: t.technician?.skills || [],
        regions: t.technician?.regions || [],
        ticketHandled: t.assignedTickets.length,
      }))
    );
  } catch (err: any) {
    error(res, `获取维修员统计失败: ${err.message}`, 500);
  }
};

export const getInventoryAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const where: any = { quantity: { lte: prisma.inventory.fields.minStock } };
    if (req.user?.role === Role.STORE_MANAGER && req.user.storeId) {
      where.storeId = req.user.storeId;
    }

    const alerts = await prisma.inventory.findMany({
      where,
      include: { sparePart: true, store: true },
      orderBy: { quantity: 'asc' },
      take: 50,
    });

    success(
      res,
      alerts.map((a) => ({
        id: a.id,
        partCode: a.sparePart.partCode,
        partName: a.sparePart.name,
        storeName: a.store?.name,
        quantity: a.quantity,
        minStock: a.minStock,
        shortage: a.minStock - a.quantity,
        lockedQty: a.lockedQty,
      }))
    );
  } catch (err: any) {
    error(res, `获取库存预警失败: ${err.message}`, 500);
  }
};
