import { Router } from 'express';
import {
  generateRestockSuggestions,
  listRestockSuggestions,
  dismissRestockSuggestion,
  createPurchasePlanFromSuggestions,
  createPurchasePlanManual,
  listPurchasePlans,
  getPurchasePlan,
  updatePurchasePlanItems,
  submitPurchasePlan,
  approvePurchasePlan,
  rejectPurchasePlan,
  cancelPurchasePlan,
  createPurchaseReceipt,
  confirmPurchaseReceipt,
  listPurchaseReceipts,
  deletePurchaseReceipt,
} from '../controllers/purchaseController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireStoreOrAdmin } from '../middleware/permission';

const router = Router();

router.use(authenticate);

// ===== 补货建议 =====
router.post('/restock-suggestions/generate', requireStoreOrAdmin, generateRestockSuggestions);
router.get('/restock-suggestions', requireStoreOrAdmin, listRestockSuggestions);
router.post('/restock-suggestions/:id/dismiss', requireStoreOrAdmin, dismissRestockSuggestion);

// ===== 采购计划 =====
router.post('/plans/from-suggestions', requireStoreOrAdmin, createPurchasePlanFromSuggestions);
router.post('/plans', requireStoreOrAdmin, createPurchasePlanManual);
router.get('/plans', listPurchasePlans);
router.get('/plans/:id', getPurchasePlan);
router.put('/plans/:id/items', requireStoreOrAdmin, updatePurchasePlanItems);
router.post('/plans/:id/submit', requireStoreOrAdmin, submitPurchasePlan);
router.post('/plans/:id/approve', requireAdmin, approvePurchasePlan);
router.post('/plans/:id/reject', requireAdmin, rejectPurchasePlan);
router.post('/plans/:id/cancel', requireStoreOrAdmin, cancelPurchasePlan);

// ===== 采购入库 =====
router.post('/receipts', requireStoreOrAdmin, createPurchaseReceipt);
router.post('/receipts/:id/confirm', requireStoreOrAdmin, confirmPurchaseReceipt);
router.get('/receipts', listPurchaseReceipts);
router.delete('/receipts/:id', requireStoreOrAdmin, deletePurchaseReceipt);

export default router;
