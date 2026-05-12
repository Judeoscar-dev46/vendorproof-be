import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { createWallet, getWalletDetails, getWalletByOwner } from './wallet.controller';

const router = Router();

router.get('/owner/:ownerId', authenticate, getWalletByOwner);
router.get('/:id', authenticate, getWalletDetails);
router.post('/', authenticate, createWallet);

export default router;
