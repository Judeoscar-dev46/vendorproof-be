import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { createWallet, getWalletDetails, getWalletByOwner, simulateFunding } from './wallet.controller';

const router = Router();

router.get('/owner/:ownerId', authenticate, getWalletByOwner);
router.get('/:id', authenticate, getWalletDetails);
router.post('/', authenticate, createWallet);
router.post('/simulate-funding', authenticate, simulateFunding);

export default router;
