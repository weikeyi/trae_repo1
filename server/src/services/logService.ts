import { LogAction } from '../constants/enums';
import prisma from '../config/prisma';

interface LogOptions {
  action: LogAction;
  module: string;
  targetId?: number;
  targetType?: string;
  operatorId: number;
  detail?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}

export const logOperation = async (options: LogOptions): Promise<void> => {
  try {
    await prisma.operationLog.create({
      data: {
        action: options.action,
        module: options.module,
        targetId: options.targetId,
        targetType: options.targetType,
        operatorId: options.operatorId,
        detail: options.detail,
        oldValue: options.oldValue ? JSON.stringify(options.oldValue) : undefined,
        newValue: options.newValue ? JSON.stringify(options.newValue) : undefined,
        ipAddress: options.ipAddress,
      },
    });
  } catch (err) {
    console.error('Failed to create operation log:', err);
  }
};
