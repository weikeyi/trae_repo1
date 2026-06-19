import { Response, NextFunction } from 'express';
import { Role } from '../constants/enums';
import { AuthRequest } from '../types';
import { error } from '../utils/response';

export const requireRoles = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      error(res, '权限不足', 403);
      return;
    }
    next();
  };
};

export const requireAdmin = requireRoles(Role.ADMIN);
export const requireTechnicianOrAdmin = requireRoles(Role.TECHNICIAN, Role.ADMIN);
export const requireStoreOrAdmin = requireRoles(Role.STORE_MANAGER, Role.ADMIN);
