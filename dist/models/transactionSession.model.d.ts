import mongoose, { Document } from 'mongoose';
export type SessionStatus = 'awaiting_recipient' | 'both_verifying' | 'initiator_verified' | 'recipient_verified' | 'both_verified' | 'awaiting_initiator_consent' | 'awaiting_recipient_consent' | 'awaiting_both_consent' | 'payment_released' | 'blocked' | 'cancelled' | 'expired';
export interface ITransactionSession extends Document {
    sessionCode: string;
    initiatorProfileId: mongoose.Types.ObjectId;
    recipientPhone?: string;
    recipientEmail?: string;
    recipientProfileId?: mongoose.Types.ObjectId;
    amount: number;
    description: string;
    status: SessionStatus;
    initiatorVerificationId?: mongoose.Types.ObjectId;
    recipientVerificationId?: mongoose.Types.ObjectId;
    initiatorTrustScore?: number;
    recipientTrustScore?: number;
    initiatorVerdict?: 'trusted' | 'review' | 'blocked';
    recipientVerdict?: 'trusted' | 'review' | 'blocked';
    initiatorConsented: boolean;
    recipientConsented: boolean;
    squadTransactionRef?: string;
    paymentReleasedAt?: Date;
    blockedReason?: string;
    expiresAt: Date;
    guestDetails?: {
        fullName: string;
        phoneNumber: string;
        bvn?: string;
        bankAccount?: string;
        bankCode?: string;
        dateOfBirth?: Date;
    };
    guestToken?: string;
    createdAt: Date;
}
export declare const TransactionSession: mongoose.Model<ITransactionSession, {}, {}, {}, mongoose.Document<unknown, {}, ITransactionSession, {}, mongoose.DefaultSchemaOptions> & ITransactionSession & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITransactionSession>;
//# sourceMappingURL=transactionSession.model.d.ts.map