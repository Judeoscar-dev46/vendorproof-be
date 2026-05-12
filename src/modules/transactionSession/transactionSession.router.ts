import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
    createSession,
    joinSession,
    submitVerification,
    uploadDocument,
    giveConsent,
    getSessionStatus,
} from './transactionSession.controller';

const router = Router();

// Initiator: start a new P2P session
router.post('/', authenticate, createSession);

// Recipient: join an existing session
router.post('/:sessionCode/join', authenticate, joinSession);

// Both parties: submit identity document
router.post('/:sessionCode/verify', authenticate, uploadDocument, submitVerification);

// Both parties: consent to release payment
router.post('/:sessionCode/consent', authenticate, giveConsent);

// Both parties: get session status (only shows both scores after both_verified)
router.get('/:sessionCode/status', authenticate, getSessionStatus);

export default router;
