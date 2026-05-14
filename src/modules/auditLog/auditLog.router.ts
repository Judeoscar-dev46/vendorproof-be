import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getAuditLogs } from './auditLog.controller';

const router = Router();

router.get('/', authenticate, getAuditLogs);

export default router;
