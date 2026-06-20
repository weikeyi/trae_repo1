import { InventoryChangeType } from '../constants/enums';
import prisma from '../config/prisma';
import { PrismaClient } from '@prisma/client';

interface CreateInventoryLogOptions {
  sparePartId: number;
  storeId: number;
  changeType: InventoryChangeType;
  quantityBefore: number;
  quantityAfter: number;
  lockedQtyBefore: number;
  lockedQtyAfter: number;
  availableQtyBefore: number;
  availableQtyAfter: number;
  relatedTicketId?: number | null;
  relatedRequestId?: number | null;
  relatedTransferId?: number | null;
  operatorId: number;
  remark?: string;
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
}

export const createInventoryLog = async (options: CreateInventoryLogOptions): Promise<void> => {
  const client = options.tx || prisma;
  try {
    await client.inventoryLog.create({
      data: {
        sparePartId: options.sparePartId,
        storeId: options.storeId,
        changeType: options.changeType,
        quantityBefore: options.quantityBefore,
        quantityAfter: options.quantityAfter,
        lockedQtyBefore: options.lockedQtyBefore,
        lockedQtyAfter: options.lockedQtyAfter,
        availableQtyBefore: options.availableQtyBefore,
        availableQtyAfter: options.availableQtyAfter,
        relatedTicketId: options.relatedTicketId,
        relatedRequestId: options.relatedRequestId,
        relatedTransferId: options.relatedTransferId,
        operatorId: options.operatorId,
        remark: options.remark,
      },
    });
  } catch (err) {
    console.error('Failed to create inventory log:', err);
  }
};
