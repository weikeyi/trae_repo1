import { Router } from 'express';
import {
  listTickets,
  getTicket,
  createTicket,
  assignTicket,
  updateTicketStatus,
  recommendTechnicians,
  mergeTicket,
  exportTicketsCsv,
  rejectTicket,
  checkSlaEscalation,
} from '../controllers/ticketController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createTicketSchema,
  assignTicketSchema,
  updateTicketStatusSchema,
  mergeTicketSchema,
} from '../validation/schemas';

const router = Router();

router.use(authenticate);

router.get('/recommend-technicians', recommendTechnicians);
router.get('/export', exportTicketsCsv);
router.post('/check-sla-escalation', checkSlaEscalation);
router.get('/', listTickets);
router.get('/:id', getTicket);
router.post('/', validate(createTicketSchema), createTicket);
router.post('/:id/assign', validate(assignTicketSchema), assignTicket);
router.post('/:id/status', validate(updateTicketStatusSchema), updateTicketStatus);
router.post('/:id/merge', validate(mergeTicketSchema), mergeTicket);
router.post('/:id/reject', rejectTicket);

export default router;
