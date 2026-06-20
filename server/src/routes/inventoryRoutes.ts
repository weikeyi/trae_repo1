import { Router } from 'express';
import {
  listInventories,
  getInventory,
  updateInventory,
  checkAvailability,
  listSparePartRequests,
  getSparePartRequest,
  createSparePartRequest,
  updateSparePartRequest,
  cancelSparePartRequest,
  listTransfers,
  createTransfer,
  updateTransfer,
  receiveTransfer,
  listInventoryLogs,
  getLowStockAlerts,
} from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireTechnicianOrAdmin } from '../middleware/permission';
import { validate } from '../middleware/validate';
import {
  updateInventorySchema,
  createSparePartRequestSchema,
  updateSparePartRequestSchema,
  createTransferSchema,
  updateTransferSchema,
} from '../validation/schemas';

const router = Router();

router.use(authenticate);

// ===== 库存检查 =====
router.get('/check-availability', checkAvailability);

// ===== 备件申请（注意：必须在 /:id 之前，避免被动态路由截获）=====
router.get('/requests', listSparePartRequests);
router.get('/requests/:id', getSparePartRequest);
router.post('/requests', requireTechnicianOrAdmin, validate(createSparePartRequestSchema), createSparePartRequest);
router.put('/requests/:id', requireAdmin, validate(updateSparePartRequestSchema), updateSparePartRequest);
router.post('/requests/:id/cancel', cancelSparePartRequest);

// ===== 调拨管理（注意：必须在 /:id 之前）=====
router.get('/transfers', listTransfers);
router.post('/transfers', requireAdmin, validate(createTransferSchema), createTransfer);
router.put('/transfers/:id', requireAdmin, validate(updateTransferSchema), updateTransfer);
router.post('/transfers/:id/receive', receiveTransfer);

// ===== 库存流水与低库存预警 =====
router.get('/logs', listInventoryLogs);
router.get('/low-stock-alerts', getLowStockAlerts);

// ===== 库存 CRUD（动态路由 /:id 放最后）=====
router.get('/', listInventories);
router.get('/:id', getInventory);
router.put('/:id', requireAdmin, validate(updateInventorySchema), updateInventory);

export default router;
