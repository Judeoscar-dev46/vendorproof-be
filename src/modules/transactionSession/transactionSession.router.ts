import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth';
import {
    createSession,
    joinSession,
    submitVerification,
    uploadVerificationFiles,
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

router.post('/:sessionCode/verify', authenticate, uploadVerificationFiles, submitVerification);

router.post('/:sessionCode/consent', authenticate, giveConsent);

router.get('/:sessionCode/status', optionalAuthenticate, getSessionStatus);

// Guest Routes
router.get('/:sessionCode/details', getDetails);
router.post('/:sessionCode/join-guest', joinAsGuest);
router.post('/:sessionCode/verify-guest', uploadVerificationFiles, submitVerificationAsGuest);
router.post('/:sessionCode/consent-guest', giveConsentAsGuest);

export default router;
