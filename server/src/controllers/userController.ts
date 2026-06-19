import { Response } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { hashPassword } from '../utils/auth';
import { success, error } from '../utils/response';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { logOperation } from '../services/logService';
import { LogAction } from '@prisma/client';

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req);
    const { role, keyword, isActive } = req.query;

    const where: any = {};
    if (role) where.role = role as Role;
    if (keyword) {
      where.OR = [
        { username: { contains: keyword as string } },
        { realName: { contains: keyword as string } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        include: { store: true, technician: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const result = buildPaginatedResult(
      users.map(u => ({ ...u, passwordHash: undefined })),
      total, page, pageSize
    );
    success(res, result);
  } catch (err) {
    error(res, '获取用户列表失败', 500);
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { store: true, technician: true },
    });
    if (!user) {
      error(res, '用户不存在', 404);
      return;
    }
    const { passwordHash, ...userData } = user;
    success(res, userData);
  } catch (err) {
    error(res, '获取用户信息失败', 500);
  }
};

export const listTechnicians = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { region } = req.query;
    const where: any = { role: Role.TECHNICIAN, isActive: true };
    if (region) {
      where.technician = { regions: { has: region as string } };
    }
    const technicians = await prisma.user.findMany({
      where,
      include: { technician: true, store: true },
      orderBy: { realName: 'asc' },
    });
    success(res, technicians.map(t => ({ ...t, passwordHash: undefined })));
  } catch (err) {
    error(res, '获取维修员列表失败', 500);
  }
};

export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { store: true, technician: true },
    });
    if (!user) {
      error(res, '用户不存在', 404);
      return;
    }
    const { passwordHash, ...userData } = user;
    success(res, userData);
  } catch (err) {
    error(res, '获取用户信息失败', 500);
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password, realName, phone, email, role, storeId, skills, regions, maxLoad } = req.body;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      error(res, '用户名已存在', 400);
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        realName,
        phone,
        email: email || undefined,
        role,
        storeId,
        technician: role === Role.TECHNICIAN ? {
          create: {
            skills: skills || [],
            regions: regions || [],
            maxLoad: maxLoad || 5,
          },
        } : undefined,
      },
      include: { store: true, technician: true },
    });

    await logOperation({
      action: LogAction.CREATE,
      module: 'USER',
      targetId: user.id,
      targetType: 'User',
      operatorId: req.user!.userId,
      detail: `创建用户: ${username}`,
      newValue: { username, realName, role },
      ipAddress: req.ip,
    });

    const { passwordHash: _, ...userData } = user;
    success(res, userData, '用户创建成功', 201);
  } catch (err: any) {
    error(res, `创建用户失败: ${err.message}`, 500);
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { password, realName, phone, email, role, storeId, isActive, skills, regions, maxLoad } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      error(res, '用户不存在', 404);
      return;
    }

    const updateData: any = { realName, phone, email, role, storeId, isActive };
    if (password) updateData.passwordHash = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        technician: role === Role.TECHNICIAN ? {
          upsert: {
            create: { skills: skills || [], regions: regions || [], maxLoad: maxLoad || 5 },
            update: { skills, regions, maxLoad },
          },
        } : existing.technician ? { delete: true } : undefined,
      },
      include: { store: true, technician: true },
    });

    await logOperation({
      action: LogAction.UPDATE,
      module: 'USER',
      targetId: user.id,
      targetType: 'User',
      operatorId: req.user!.userId,
      detail: `更新用户: ${user.username}`,
      newValue: req.body,
      oldValue: existing,
      ipAddress: req.ip,
    });

    const { passwordHash: _, ...userData } = user;
    success(res, userData, '用户更新成功');
  } catch (err: any) {
    error(res, `更新用户失败: ${err.message}`, 500);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user?.userId === id) {
      error(res, '不能删除自己', 400);
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      error(res, '用户不存在', 404);
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await logOperation({
      action: LogAction.DELETE,
      module: 'USER',
      targetId: id,
      targetType: 'User',
      operatorId: req.user!.userId,
      detail: `禁用用户: ${existing.username}`,
      oldValue: existing,
      ipAddress: req.ip,
    });

    success(res, null, '用户已禁用');
  } catch (err: any) {
    error(res, `禁用用户失败: ${err.message}`, 500);
  }
};
