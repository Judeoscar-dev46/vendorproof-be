import { Router } from 'express';
import {
    createVendor,
    getVendor,
    getAllVendors,
    updateVendorStatus,
    deleteVendor,
} from './vendor.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.post('/', authenticate, createVendor);

router.get('/', authenticate, getAllVendors);
router.get('/:id', authenticate, getVendor);

router.patch('/:id/status', authenticate, requireRole('admin', 'officer'), updateVendorStatus);
router.delete('/:id', authenticate, requireRole('admin'), deleteVendor);

export default router;