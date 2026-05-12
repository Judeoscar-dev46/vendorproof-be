import mongoose, { Schema, Document } from 'mongoose';

export type VerificationRequestStatus =
    | 'pending_vendor_action'
    | 'in_progress'
    | 'trusted'
    | 'review'
    | 'blocked'
    | 'unverified'   // vendor explicitly declined
    | 'expired';

export interface IVerificationRequest extends Document {
    requestCode: string;
    institutionId: mongoose.Types.ObjectId;
    vendorEmail?: string;
    vendorPhone?: string;
    vendorProfileId?: mongoose.Types.ObjectId;
    paymentAmount: number;
    paymentDescription: string;
    status: VerificationRequestStatus;
    trustScore?: number;
    verdict?: 'trusted' | 'review' | 'blocked';
    subScores?: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
    };
    verificationId?: mongoose.Types.ObjectId;
    guestVerified?: boolean;
    guestToken?: string;
    guestDetails?: {
        fullName?: string;
        phoneNumber?: string;
    };
    expiresAt: Date;
    declinedAt?: Date;
    declineReason?: string;
    createdAt: Date;
}

const VerificationRequestSchema = new Schema<IVerificationRequest>({
    requestCode: { type: String, required: true, unique: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'InstitutionProfile', required: true },
    vendorEmail: String,
    vendorPhone: String,
    vendorProfileId: { type: Schema.Types.ObjectId, ref: 'VendorProfile' },
    paymentAmount: { type: Number, required: true },
    paymentDescription: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending_vendor_action', 'in_progress', 'trusted', 'review', 'blocked', 'unverified', 'expired'],
        default: 'pending_vendor_action',
    },
    trustScore: Number,
    verdict: { type: String, enum: ['trusted', 'review', 'blocked'] },
    subScores: {
        documentScore: Number,
        anomalyScore: Number,
        networkScore: Number,
    },
    verificationId: { type: Schema.Types.ObjectId, ref: 'Verification' },
    guestVerified: { type: Boolean, default: false },
    guestToken: { type: String, select: false },
    guestDetails: {
        fullName: String,
        phoneNumber: String,
    },
    expiresAt: { type: Date, required: true },
    declinedAt: Date,
    declineReason: String,
}, { timestamps: true });

VerificationRequestSchema.index({ institutionId: 1 });
VerificationRequestSchema.index({ status: 1 });
VerificationRequestSchema.index({ expiresAt: 1 });

export const VerificationRequest = mongoose.model<IVerificationRequest>(
    'VerificationRequest',
    VerificationRequestSchema
);