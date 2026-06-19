import { Router } from 'express';
import {
  listSpareParts,
  getSparePart,
  createSparePart,
  updateSparePart,
  deleteSparePart,
} from '../controllers/sparePartController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { createSparePartSchema, updateSparePartSchema } from '../validation/schemas';

const router = Router();

router.use(authenticate);

router.get('/', listSpareParts);
router.get('/:id', getSparePart);
router.post('/', requireAdmin, validate(createSparePartSchema), createSparePart);
router.put('/:id', requireAdmin, validate(updateSparePartSchema), updateSparePart);
router.delete('/:id', requireAdmin, deleteSparePart);

export default router;
