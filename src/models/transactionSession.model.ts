import mongoose, { Schema, Document } from 'mongoose';

export type SessionStatus =
    | 'awaiting_recipient'
    | 'both_verifying'
    | 'initiator_verified'
    | 'recipient_verified'
    | 'both_verified'
    | 'awaiting_initiator_consent'
    | 'awaiting_recipient_consent'
    | 'awaiting_both_consent'
    | 'payment_released'
    | 'blocked'
    | 'cancelled'
    | 'expired';

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
    createdAt: Date;
}

const TransactionSessionSchema = new Schema<ITransactionSession>({
    sessionCode: { type: String, required: true, unique: true },
    initiatorProfileId: { type: Schema.Types.ObjectId, ref: 'IndividualProfile', required: true },
    recipientPhone: String,
    recipientEmail: String,
    recipientProfileId: { type: Schema.Types.ObjectId, ref: 'IndividualProfile' },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    status: {
        type: String,
        enum: [
            'awaiting_recipient', 'both_verifying',
            'initiator_verified', 'recipient_verified', 'both_verified',
            'awaiting_initiator_consent', 'awaiting_recipient_consent',
            'awaiting_both_consent', 'payment_released',
            'blocked', 'cancelled', 'expired',
        ],
        default: 'awaiting_recipient',
    },
    initiatorVerificationId: { type: Schema.Types.ObjectId, ref: 'Verification' },
    recipientVerificationId: { type: Schema.Types.ObjectId, ref: 'Verification' },
    initiatorTrustScore: Number,
    recipientTrustScore: Number,
    initiatorVerdict: { type: String, enum: ['trusted', 'review', 'blocked'] },
    recipientVerdict: { type: String, enum: ['trusted', 'review', 'blocked'] },
    initiatorConsented: { type: Boolean, default: false },
    recipientConsented: { type: Boolean, default: false },
    squadTransactionRef: String,
    paymentReleasedAt: Date,
    blockedReason: String,
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

TransactionSessionSchema.index({ initiatorProfileId: 1 });
TransactionSessionSchema.index({ recipientProfileId: 1 });
TransactionSessionSchema.index({ expiresAt: 1 });

export const TransactionSession = mongoose.model<ITransactionSession>(
    'TransactionSession',
    TransactionSessionSchema
);