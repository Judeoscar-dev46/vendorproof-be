import mongoose, { Schema, Document } from 'mongoose';

export interface IIndividualProfile extends Document {
    fullName: string;
    bvn: string;
    ninNumber?: string;
    bankAccount: string;
    bankCode: string;
    phoneNumber: string;
    dateOfBirth: Date;
    email?: string;
    passwordHash: string;
    trustScore?: number;
    verificationStatus: 'unverified' | 'pending' | 'trusted' | 'review' | 'blocked';
    lastVerifiedAt?: Date;
    internalFlags: string[];
    createdAt: Date;
}

const IndividualProfileSchema = new Schema<IIndividualProfile>({
    fullName: { type: String, required: true },
    bvn: { type: String, required: true, select: false },
    ninNumber: { type: String, select: false },
    bankAccount: { type: String, required: true, select: false },
    bankCode: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    dateOfBirth: { type: Date, required: true },
    email: { type: String },
    passwordHash: { type: String, required: true, select: false },
    trustScore: Number,
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'trusted', 'review', 'blocked'],
        default: 'unverified',
    },
    lastVerifiedAt: Date,
    internalFlags: [String],
}, { timestamps: true });

IndividualProfileSchema.index({ bvn: 1 });
IndividualProfileSchema.index({ bankAccount: 1 });

export const IndividualProfile = mongoose.model<IIndividualProfile>(
    'IndividualProfile',
    IndividualProfileSchema
);