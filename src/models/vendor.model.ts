import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
    companyName: string;
    rcNumber: string;
    directorBvn: string;
    bankAccount: string;
    bankCode: string;
    address: string;
    registrationDate: Date;
    contactEmail: string;
    status: 'pending' | 'trusted' | 'review' | 'blocked';
    latestTrustScore?: number;
    createdAt: Date;
}

const VendorSchema = new Schema<IVendor>({
    companyName: { type: String, required: true },
    rcNumber: { type: String, required: true, unique: true },
    directorBvn: { type: String, required: true },
    bankAccount: { type: String, required: true },
    bankCode: { type: String, required: true },
    address: { type: String, required: true },
    registrationDate: { type: Date, required: true },
    contactEmail: { type: String, required: true },
    status: { type: String, enum: ['pending', 'trusted', 'review', 'blocked'], default: 'pending' },
    latestTrustScore: Number,
}, { timestamps: true });

VendorSchema.index({ bankAccount: 1 });
VendorSchema.index({ directorBvn: 1 });

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);
