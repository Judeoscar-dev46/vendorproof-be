import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { createProfile, getProfile, updateProfile } from './individual.controller';

const router = Router();

router.post('/', createProfile);
router.get('/:id', authenticate, getProfile);
router.patch('/:id', authenticate, updateProfile);

export default router;
