import cron from 'node-cron';
import { VerificationRequest } from '../models/verificationRequest.model';
import { TransactionSession } from '../models/transactionSession.model';

export function startExpiryJob() {
    cron.schedule('*/15 * * * *', async () => {
        const now = new Date();

        await VerificationRequest.updateMany(
            { expiresAt: { $lt: now }, status: { $in: ['pending_vendor_action', 'in_progress'] } },
            { status: 'expired' }
        );

        await TransactionSession.updateMany(
            { expiresAt: { $lt: now }, status: { $nin: ['payment_released', 'blocked', 'cancelled', 'expired'] } },
            { status: 'expired' }
        );
    });
}