import mongoose, { Schema, Document } from 'mongoose';

export interface IVerification extends Document {
    vendorId?: mongoose.Types.ObjectId;
    subjectId?: mongoose.Types.ObjectId;
    subjectType?: 'vendor' | 'individual';
    trustScore: number;
    verdict: 'trusted' | 'review' | 'blocked';
    subScores: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
    };
    flags: string[];
    claudeReasoning: string;
    documentMetadata?: {
        extractedName?: string;
        extractedRcNumber?: string;
        nameMatch: boolean;
        rcMatch: boolean;
        documentType: string;
    };
    paymentReleased: boolean;
    squadTransactionRef?: string;
    createdAt: Date;
}

const VerificationSchema = new Schema<IVerification>({
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    subjectId: { type: Schema.Types.ObjectId },
    subjectType: { type: String, enum: ['vendor', 'individual'] },
    trustScore: { type: Number, required: true },
    verdict: { type: String, enum: ['trusted', 'review', 'blocked'], required: true },
    subScores: {
        documentScore: Number,
        anomalyScore: Number,
        networkScore: Number,
    },
    flags: [String],
    claudeReasoning: String,
    documentMetadata: {
        extractedName: String,
        extractedRcNumber: String,
        nameMatch: Boolean,
        rcMatch: Boolean,
        documentType: String,
    },
    paymentReleased: { type: Boolean, default: false },
    squadTransactionRef: String,
}, { timestamps: true });

VerificationSchema.index({ vendorId: 1 });
VerificationSchema.index({ subjectId: 1, subjectType: 1 });

export const Verification = mongoose.model<IVerification>('Verification', VerificationSchema);
