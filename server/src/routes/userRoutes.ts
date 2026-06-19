import { Router } from 'express';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
  listTechnicians,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema } from '../validation/schemas';

const router = Router();

router.use(authenticate);

router.get('/me', getCurrentUser);
router.get('/technicians', listTechnicians);
router.get('/', requireAdmin, listUsers);
router.get('/:id', requireAdmin, getUser);
router.post('/', requireAdmin, validate(createUserSchema), createUser);
router.put('/:id', requireAdmin, validate(updateUserSchema), updateUser);
router.delete('/:id', requireAdmin, deleteUser);

export default router;
