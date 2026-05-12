import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
    createProfile,
    getProfile,
    updateProfile,
    getVerificationRequests,
    getDashboard,
} from './institution.controller';

const router = Router();

router.post('/', createProfile);
router.get('/dashboard', authenticate, getDashboard);
router.get('/:id', authenticate, getProfile);
router.patch('/:id', authenticate, updateProfile);
router.get('/:id/requests', authenticate, getVerificationRequests);

export default router;
