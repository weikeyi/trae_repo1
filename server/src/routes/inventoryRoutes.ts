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

router.get('/check-availability', checkAvailability);
router.get('/', listInventories);
router.get('/:id', getInventory);
router.put('/:id', requireAdmin, validate(updateInventorySchema), updateInventory);

router.get('/requests', listSparePartRequests);
router.get('/requests/:id', getSparePartRequest);
router.post('/requests', requireTechnicianOrAdmin, validate(createSparePartRequestSchema), createSparePartRequest);
router.put('/requests/:id', requireAdmin, validate(updateSparePartRequestSchema), updateSparePartRequest);
router.post('/requests/:id/cancel', cancelSparePartRequest);

router.get('/transfers', listTransfers);
router.post('/transfers', requireAdmin, validate(createTransferSchema), createTransfer);
router.put('/transfers/:id', requireAdmin, validate(updateTransferSchema), updateTransfer);
router.post('/transfers/:id/receive', receiveTransfer);

export default router;
