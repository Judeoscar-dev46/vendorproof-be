import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
    createRequest,
    joinRequest,
    declineRequest,
    submitVerification,
    uploadDocument,
    getRequestStatus,
    getDetails,
    joinRequestGuest,
    submitVerificationGuest,
    convertGuestAccount,
    getAllRequests,
    getRequestDetailsForInstitution,
    approveRequest,
} from './verificationRequest.controller';

const router = Router();

// Institution: create, list or approve verification requests
router.post('/', authenticate, createRequest);
router.get('/', authenticate, getAllRequests);
router.get('/:requestCode', authenticate, getRequestDetailsForInstitution);
router.patch('/:requestCode/approve', authenticate, approveRequest);

// Institution: poll request status
router.get('/:requestCode/status', authenticate, getRequestStatus);

// Vendor: join, decline, or submit documents for a request
router.post('/:requestCode/join', authenticate, joinRequest);
router.post('/:requestCode/decline', authenticate, declineRequest);
router.post('/:requestCode/submit', authenticate, uploadDocument, submitVerification);

// Guest Flow (no auth required)
router.get('/guest/:requestCode', getDetails);
router.post('/guest/:requestCode/join', joinRequestGuest);
router.post('/guest/:requestCode/submit', uploadDocument, submitVerificationGuest);
router.post('/guest/:requestCode/convert', convertGuestAccount);

export default router;
