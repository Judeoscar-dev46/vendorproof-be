import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { startExpiryJob } from './jobs/expireStaleRecords';

import authRouter from './modules/auth/auth.router';
import vendorRouter from './modules/vendor/vendor.router';
import verificationRouter from './modules/verification/verification.router';
import paymentRouter from './modules/payment/payment.router';
import walletRouter from './modules/wallet/wallet.router';
import individualRouter from './modules/individual/individual.router';
import institutionRouter from './modules/institution/institution.router';
import verificationRequestRouter from './modules/verificationRequest/verificationRequest.router';
import transactionSessionRouter from './modules/transactionSession/transactionSession.router';
import auditLogRouter from './modules/auditLog/auditLog.router';

const app = express();

app.use(morgan('dev'));
app.use(cors({
    origin: '*',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/vendors', vendorRouter);
app.use('/api/verifications', verificationRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/wallets', walletRouter);
app.use('/api/individuals', individualRouter);
app.use('/api/institutions', institutionRouter);
app.use('/api/verification-requests', verificationRequestRouter);
app.use('/api/sessions', transactionSessionRouter);
app.use('/api/audit-logs', auditLogRouter);

app.use(errorHandler);

import { IndividualProfile } from './models/individualProfile.model';

mongoose.connect(env.MONGODB_URI)
    .then(async () => {
        console.log('MongoDB connected');
        
        // Ensure sparse index is applied correctly
        try {
            await IndividualProfile.syncIndexes();
            console.log('IndividualProfile indexes synced');
        } catch (err) {
            console.error('Error syncing indexes:', err);
        }

        startExpiryJob();
        app.listen(env.PORT, () => console.log(`VendorProof API running on port: ${env.PORT}`));
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    });
