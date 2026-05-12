import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationConsent extends Document {
    vendorProfileId: mongoose.Types.ObjectId;
    institutionId: mongoose.Types.ObjectId;
    requestCode: string;
    grantedAt: Date;
    expiresAt: Date;
    revokedAt?: Date;
    scoreAtConsent: number;
}

const VerificationConsentSchema = new Schema<IVerificationConsent>({
    vendorProfileId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'InstitutionProfile', required: true },
    requestCode: { type: String, required: true },
    grantedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    scoreAtConsent: { type: Number, required: true },
}, { timestamps: true });

VerificationConsentSchema.index({ vendorProfileId: 1, institutionId: 1 });

export const VerificationConsent = mongoose.model<IVerificationConsent>(
    'VerificationConsent',
    VerificationConsentSchema
);