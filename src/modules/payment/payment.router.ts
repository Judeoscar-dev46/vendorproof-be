import { Router } from 'express';
import {
    initiatePayment,
    getPaymentStatus,
    getVendorPayments,
    handleSquadWebhook,
    getBanks,
} from './payment.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/webhook', handleSquadWebhook);

router.post('/release', authenticate, initiatePayment);
router.get('/status/:verificationId', authenticate, getPaymentStatus);
router.get('/vendor/:vendorId', authenticate, getVendorPayments);
router.get('/banks', authenticate, getBanks);

export default router;