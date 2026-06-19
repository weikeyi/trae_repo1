import { Router } from 'express';
import { listSlaRules, createSlaRule, updateSlaRule, deleteSlaRule } from '../controllers/slaController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { createSlaSchema, updateSlaSchema } from '../validation/schemas';

const router = Router();

router.use(authenticate);

router.get('/', listSlaRules);
router.post('/', requireAdmin, validate(createSlaSchema), createSlaRule);
router.put('/:id', requireAdmin, validate(updateSlaSchema), updateSlaRule);
router.delete('/:id', requireAdmin, deleteSlaRule);

export default router;
