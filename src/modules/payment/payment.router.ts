import { Router } from 'express';
import {
    initiatePayment,
    getPaymentStatus,
    getVendorPayments,
    handleSquadWebhook,
    getBanks,
    verifyPayment,
    uploadDocument,
    analyseScreenshot
} from './payment.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/banks', authenticate, getBanks);
router.post('/webhook', handleSquadWebhook);

router.post('/release', authenticate, initiatePayment);
router.post('/verify-payment', authenticate, uploadDocument, verifyPayment);
router.post('/analyse-screenshot', authenticate, uploadDocument, analyseScreenshot);
router.get('/status/:verificationId', authenticate, getPaymentStatus);
router.get('/vendor/:vendorId', authenticate, getVendorPayments);

export default router;