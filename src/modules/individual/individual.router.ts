import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { createProfile, getProfile, updateProfile, verifyProfile, uploadVerificationFiles, getDashboard } from './individual.controller';

const router = Router();

router.post('/', createProfile);
router.get('/dashboard', authenticate, getDashboard);
router.get('/:id', authenticate, getProfile);
router.patch('/:id', authenticate, updateProfile);
router.post('/:id/verify', authenticate, uploadVerificationFiles, verifyProfile);

export default router;
