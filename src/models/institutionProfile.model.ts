import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitutionProfile extends Document {
    businessName: string;
    firstName: string;
    lastName: string;
    rcNumber: string;
    email: string;
    phoneNumber: string;
    address: string;
    passwordHash: string;
    unverifiedVendorPolicy: 'block' | 'review' | 'allow' | 'escalate';
    createdAt: Date;
}

const InstitutionProfileSchema = new Schema<IInstitutionProfile>({
    businessName: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    rcNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    unverifiedVendorPolicy: {
        type: String,
        enum: ['block', 'review', 'allow', 'escalate'],
        default: 'review',
    },
}, { timestamps: true });

export const InstitutionProfile = mongoose.model<IInstitutionProfile>(
    'InstitutionProfile',
    InstitutionProfileSchema
);
