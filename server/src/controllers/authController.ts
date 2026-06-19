import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { comparePassword, generateToken } from '../utils/auth';
import { success, error } from '../utils/response';
import { logOperation } from '../services/logService';
import { LogAction, Role } from '../constants/enums';

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { username },
      include: { store: true, technician: true },
    });

    if (!user || !user.isActive) {
      error(res, '用户名或密码错误', 401);
      return;
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      error(res, '用户名或密码错误', 401);
      return;
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role as Role,
      storeId: user.storeId,
    });

    await logOperation({
      action: LogAction.STATUS_CHANGE,
      module: 'AUTH',
      operatorId: user.id,
      detail: '用户登录',
      ipAddress: req.ip,
    });

    success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
        phone: user.phone,
        email: user.email,
        storeId: user.storeId,
        store: user.store,
        technician: user.technician,
      },
    }, '登录成功');
  } catch (err) {
    error(res, '登录失败', 500);
  }
};
