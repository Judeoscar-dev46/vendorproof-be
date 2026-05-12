import { Router } from 'express';
import multer from 'multer';

import { submitVerification, getVerification } from './verification.controller';
import { authenticate } from '../../middleware/auth';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.post('/', authenticate, upload.single('document'), submitVerification);
router.get('/:id', authenticate, getVerification);

export default router;