import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
    createSession,
    joinSession,
    submitVerification,
    uploadDocument,
    giveConsent,
    getSessionStatus,
    getDetails,
    joinAsGuest,
    submitVerificationAsGuest,
    giveConsentAsGuest,
} from './transactionSession.controller';

const router = Router();

router.post('/', authenticate, createSession);

router.post('/:sessionCode/join', authenticate, joinSession);

router.post('/:sessionCode/verify', authenticate, uploadDocument, submitVerification);

router.post('/:sessionCode/consent', authenticate, giveConsent);

router.get('/:sessionCode/status', getSessionStatus);

// Guest Routes
router.get('/:sessionCode/details', getDetails);
router.post('/:sessionCode/join-guest', joinAsGuest);
router.post('/:sessionCode/verify-guest', uploadDocument, submitVerificationAsGuest);
router.post('/:sessionCode/consent-guest', giveConsentAsGuest);

export default router;
