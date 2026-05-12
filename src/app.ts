import express from 'express';
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

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/vendors', vendorRouter);
app.use('/api/verifications', verificationRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/wallets', walletRouter);
app.use('/api/individuals', individualRouter);
app.use('/api/institutions', institutionRouter);
app.use('/api/verification-requests', verificationRequestRouter);
app.use('/api/sessions', transactionSessionRouter);

app.use(errorHandler);

mongoose.connect(env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected');
        startExpiryJob();
        app.listen(env.PORT, () => console.log(`VendorProof API running on port: ${env.PORT}`));
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    });
