import mongoose, { Schema, Document } from 'mongoose';

export interface IVendorProfile extends Document {
    companyName: string;
    rcNumber: string;
    directorBvn: string;
    bankAccount: string;
    bankCode: string;
    address: string;
    registrationDate: Date;
    contactEmail: string;
    phoneNumber: string;
    passwordHash?: string;
    trustScore?: number;
    verificationStatus: 'unverified' | 'pending' | 'trusted' | 'review' | 'blocked';
    lastVerifiedAt?: Date;
    internalFlags: string[];
    createdAt: Date;
}

const VendorProfileSchema = new Schema<IVendorProfile>({
    companyName: { type: String, required: true },
    rcNumber: { type: String, required: true, unique: true },
    directorBvn: { type: String, required: true, select: false },
    bankAccount: { type: String, required: true, select: false },
    bankCode: { type: String, required: true },
    address: { type: String, required: true },
    registrationDate: { type: Date, required: true },
    contactEmail: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    passwordHash: { type: String, select: false },
    trustScore: Number,
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'trusted', 'review', 'blocked'],
        default: 'unverified',
    },
    lastVerifiedAt: Date,
    internalFlags: [String],
}, { timestamps: true });

VendorProfileSchema.index({ bankAccount: 1 });
VendorProfileSchema.index({ directorBvn: 1 });

export const VendorProfile = mongoose.model<IVendorProfile>(
    'VendorProfile',
    VendorProfileSchema
);