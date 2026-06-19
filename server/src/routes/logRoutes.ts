import { Router } from 'express';
import { listLogs, exportLogsCsv } from '../controllers/logController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/permission';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', listLogs);
router.get('/export', exportLogsCsv);

export default router;
