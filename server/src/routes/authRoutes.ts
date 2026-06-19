import { Router } from 'express';
import { login } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema } from '../validation/schemas';

const router = Router();

router.post('/login', validate(loginSchema), login);

export default router;
