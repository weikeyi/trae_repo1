import { Router } from 'express';
import {
  getDashboardStats,
  getTicketTrend,
  getTicketsByStatus,
  getTicketsByUrgency,
  getStoreStats,
  getTechnicianStats,
  getInventoryAlert,
} from '../controllers/statsController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/permission';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/ticket-trend', requireAdmin, getTicketTrend);
router.get('/tickets-by-status', getTicketsByStatus);
router.get('/tickets-by-urgency', getTicketsByUrgency);
router.get('/store-stats', requireAdmin, getStoreStats);
router.get('/technician-stats', requireAdmin, getTechnicianStats);
router.get('/inventory-alert', requireAdmin, getInventoryAlert);

export default router;
