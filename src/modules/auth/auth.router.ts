import { Router } from 'express';
import { registerAdmin, login } from './auth.controller';
import { optionalAuthenticate } from '../../middleware/auth';

const router = Router();

router.post('/register', optionalAuthenticate, registerAdmin);
router.post('/login', login);

export default router;
