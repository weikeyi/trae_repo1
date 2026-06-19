import { Router } from 'express';
import {
  listStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
} from '../controllers/storeController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { createStoreSchema, updateStoreSchema } from '../validation/schemas';

const router = Router();

router.use(authenticate);

router.get('/', listStores);
router.get('/:id', getStore);
router.post('/', requireAdmin, validate(createStoreSchema), createStore);
router.put('/:id', requireAdmin, validate(updateStoreSchema), updateStore);
router.delete('/:id', requireAdmin, deleteStore);

export default router;
