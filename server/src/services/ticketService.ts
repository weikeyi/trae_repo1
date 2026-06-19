import { TicketStatus, UrgencyLevel, Role, parseJsonArray } from '../constants/enums';
import prisma from '../config/prisma';

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.CREATED]: [TicketStatus.ASSIGNED, TicketStatus.CANCELLED, TicketStatus.MERGED],
  [TicketStatus.ASSIGNED]: [
    TicketStatus.TECHNICIAN_ON_WAY,
    TicketStatus.REJECTED_BY_TECHNICIAN,
    TicketStatus.CANCELLED,
    TicketStatus.ESCALATED,
  ],
  [TicketStatus.REJECTED_BY_TECHNICIAN]: [TicketStatus.ASSIGNED, TicketStatus.CANCELLED, TicketStatus.ESCALATED],
  [TicketStatus.TECHNICIAN_ON_WAY]: [TicketStatus.DIAGNOSING, TicketStatus.CANCELLED, TicketStatus.ESCALATED],
  [TicketStatus.DIAGNOSING]: [
    TicketStatus.WAITING_SPARE_PARTS,
    TicketStatus.REPAIRING,
    TicketStatus.CANNOT_REPAIR,
    TicketStatus.ESCALATED,
  ],
  [TicketStatus.WAITING_SPARE_PARTS]: [TicketStatus.REPAIRING, TicketStatus.CANCELLED, TicketStatus.ESCALATED],
  [TicketStatus.REPAIRING]: [
    TicketStatus.COMPLETED,
    TicketStatus.CANNOT_REPAIR,
    TicketStatus.WAITING_SPARE_PARTS,
    TicketStatus.ESCALATED,
  ],
  [TicketStatus.COMPLETED]: [TicketStatus.ACCEPTED, TicketStatus.REJECTED],
  [TicketStatus.CANNOT_REPAIR]: [TicketStatus.ACCEPTED, TicketStatus.REJECTED, TicketStatus.REPAIRING],
  [TicketStatus.ACCEPTED]: [],
  [TicketStatus.REJECTED]: [TicketStatus.REPAIRING, TicketStatus.CANNOT_REPAIR, TicketStatus.CANCELLED],
  [TicketStatus.CANCELLED]: [],
  [TicketStatus.MERGED]: [],
  [TicketStatus.ESCALATED]: [TicketStatus.ASSIGNED, TicketStatus.CANCELLED],
};

export const canTransition = (from: string, to: string): boolean => {
  return STATUS_TRANSITIONS[from as TicketStatus]?.includes(to as TicketStatus) || false;
};

export const canUserTransition = (
  userRole: string,
  currentStatus: string,
  targetStatus: string,
  userId: number,
  assignedToId: number | null,
  storeId: number,
  userStoreId: number | null
): boolean => {
  if (userRole === Role.ADMIN) return true;

  switch (targetStatus) {
    case TicketStatus.ASSIGNED:
      return userRole === Role.ADMIN;
    case TicketStatus.REJECTED_BY_TECHNICIAN:
      return userRole === Role.TECHNICIAN && assignedToId === userId;
    case TicketStatus.TECHNICIAN_ON_WAY:
    case TicketStatus.DIAGNOSING:
    case TicketStatus.WAITING_SPARE_PARTS:
    case TicketStatus.REPAIRING:
    case TicketStatus.CANNOT_REPAIR:
    case TicketStatus.COMPLETED:
      return userRole === Role.TECHNICIAN && assignedToId === userId;
    case TicketStatus.ACCEPTED:
    case TicketStatus.REJECTED:
      return userRole === Role.STORE_MANAGER && userStoreId === storeId;
    case TicketStatus.CANCELLED:
      if (userRole === Role.STORE_MANAGER && userStoreId === storeId) {
        return ([TicketStatus.CREATED, TicketStatus.ASSIGNED, TicketStatus.WAITING_SPARE_PARTS] as string[]).includes(
          currentStatus
        );
      }
      return userRole === Role.ADMIN;
    case TicketStatus.MERGED:
      return userRole === Role.ADMIN;
    case TicketStatus.ESCALATED:
      return userRole === Role.ADMIN;
    default:
      return false;
  }
};

export interface RecommendedTechnician {
  id: number;
  realName: string;
  username: string;
  score: number;
  currentLoad: number;
  maxLoad: number;
  regions: string[];
  skills: string[];
}

export const recommendTechnicians = async (
  storeRegion: string,
  faultType: string,
  urgency: UrgencyLevel
): Promise<RecommendedTechnician[]> => {
  // SQLite Json 字段不支持 `has:` 操作符，先查出所有 technician 再在内存过滤
  const technicians = await prisma.user.findMany({
    where: {
      role: Role.TECHNICIAN,
      isActive: true,
    },
    include: { technician: true },
  });

  const filtered = technicians.filter((t) => {
    if (!t.technician) return false;
    const regions = parseJsonArray(t.technician.regions);
    return regions.includes(storeRegion);
  });

  const urgencyWeight = urgency === UrgencyLevel.URGENT ? 2 : urgency === UrgencyLevel.HIGH ? 1.5 : 1;

  const scored = filtered
    .map((tech) => {
      const profile = tech.technician!;
      const skills = parseJsonArray(profile.skills);
      const regions = parseJsonArray(profile.regions);
      let score = 0;
      if (skills.includes(faultType)) score += 50;
      if (skills.some((s) => faultType.includes(s) || s.includes(faultType))) score += 25;
      const loadRatio = profile.currentLoad / profile.maxLoad;
      score += (1 - loadRatio) * 30;
      score += profile.rating * 5;
      score *= urgencyWeight;

      return {
        id: tech.id,
        realName: tech.realName,
        username: tech.username,
        score: Math.round(score * 10) / 10,
        currentLoad: profile.currentLoad,
        maxLoad: profile.maxLoad,
        regions,
        skills,
      };
    })
    .filter((t) => t.currentLoad < t.maxLoad)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 10);
};

export const calculateSlaDeadline = async (urgency: UrgencyLevel, createdAt: Date): Promise<Date | null> => {
  const sla = await prisma.slaRule.findUnique({ where: { urgency } });
  if (!sla) return null;
  return new Date(createdAt.getTime() + sla.responseMinutes * 60 * 1000);
};

export const generateTicketNo = (): string => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `WO${dateStr}${random}`;
};

export const checkAndEscalateOverdue = async (): Promise<number> => {
  const now = new Date();
  const overdue = await prisma.repairTicket.findMany({
    where: {
      slaDeadline: { lte: now },
      escalated: false,
      status: { in: [TicketStatus.CREATED, TicketStatus.ASSIGNED, TicketStatus.REJECTED_BY_TECHNICIAN] },
    },
  });

  for (const ticket of overdue) {
    await prisma.$transaction(async (tx) => {
      await tx.repairTicket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.ESCALATED,
          escalated: true,
          escalationReason: 'SLA超时自动升级',
        },
      });
      await tx.statusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: ticket.status,
          toStatus: TicketStatus.ESCALATED,
          operatorId: ticket.createdById,
          remark: 'SLA超时自动升级',
        },
      });
    });
  }
  return overdue.length;
};

export const findDuplicateTicket = async (
  equipmentId: number,
  faultType: string,
  description: string
) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeStatuses = [
    TicketStatus.CREATED,
    TicketStatus.ASSIGNED,
    TicketStatus.TECHNICIAN_ON_WAY,
    TicketStatus.DIAGNOSING,
    TicketStatus.WAITING_SPARE_PARTS,
    TicketStatus.REPAIRING,
  ];

  return prisma.repairTicket.findFirst({
    where: {
      equipmentId,
      faultType,
      status: { in: activeStatuses },
      createdAt: { gte: oneDayAgo },
      description: { contains: description.slice(0, 20) },
    },
  });
};
