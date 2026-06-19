import { Router } from 'express';
import {
  listEquipments,
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} from '../controllers/equipmentController';
import { authenticate } from '../middleware/auth';
import { requireStoreOrAdmin } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { createEquipmentSchema, updateEquipmentSchema } from '../validation/schemas';

const router = Router();

router.use(authenticate);

router.get('/', listEquipments);
router.get('/:id', getEquipment);
router.post('/', requireStoreOrAdmin, validate(createEquipmentSchema), createEquipment);
router.put('/:id', requireStoreOrAdmin, validate(updateEquipmentSchema), updateEquipment);
router.delete('/:id', requireStoreOrAdmin, deleteEquipment);

export default router;
