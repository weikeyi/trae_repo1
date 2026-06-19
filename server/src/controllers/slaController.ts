import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { logOperation } from '../services/logService';
import { LogAction } from '@prisma/client';

export const listSlaRules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rules = await prisma.slaRule.findMany({ orderBy: { urgency: 'asc' } });
    success(res, rules);
  } catch (err) {
    error(res, '获取SLA规则失败', 500);
  }
};

export const createSlaRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.slaRule.findUnique({ where: { urgency: req.body.urgency } });
    if (existing) {
      error(res, '该紧急等级的SLA规则已存在', 400);
      return;
    }
    const rule = await prisma.slaRule.create({ data: req.body });
    await logOperation({
      action: LogAction.CREATE,
      module: 'SLA',
      targetId: rule.id,
      operatorId: req.user!.userId,
      detail: `创建SLA规则: ${rule.urgency}`,
      newValue: req.body,
      ipAddress: req.ip,
    });
    success(res, rule, 'SLA规则创建成功', 201);
  } catch (err: any) {
    error(res, `创建SLA规则失败: ${err.message}`, 500);
  }
};

export const updateSlaRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.slaRule.findUnique({ where: { id } });
    if (!existing) {
      error(res, 'SLA规则不存在', 404);
      return;
    }
    const rule = await prisma.slaRule.update({ where: { id }, data: req.body });
    await logOperation({
      action: LogAction.UPDATE,
      module: 'SLA',
      targetId: rule.id,
      operatorId: req.user!.userId,
      detail: `更新SLA规则: ${rule.urgency}`,
      newValue: req.body,
      oldValue: existing,
      ipAddress: req.ip,
    });
    success(res, rule, 'SLA规则更新成功');
  } catch (err: any) {
    error(res, `更新SLA规则失败: ${err.message}`, 500);
  }
};

export const deleteSlaRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.slaRule.findUnique({ where: { id } });
    if (!existing) {
      error(res, 'SLA规则不存在', 404);
      return;
    }
    await prisma.slaRule.delete({ where: { id } });
    await logOperation({
      action: LogAction.DELETE,
      module: 'SLA',
      targetId: id,
      operatorId: req.user!.userId,
      detail: `删除SLA规则: ${existing.urgency}`,
      oldValue: existing,
      ipAddress: req.ip,
    });
    success(res, null, 'SLA规则删除成功');
  } catch (err: any) {
    error(res, `删除SLA规则失败: ${err.message}`, 500);
  }
};
