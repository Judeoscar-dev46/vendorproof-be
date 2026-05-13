import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { createProfile, getProfile, updateProfile, verifyProfile, uploadDocument } from './individual.controller';

const router = Router();

router.post('/', createProfile);
router.get('/:id', authenticate, getProfile);
router.patch('/:id', authenticate, updateProfile);
router.post('/:id/verify', authenticate, uploadDocument, verifyProfile);

export default router;
