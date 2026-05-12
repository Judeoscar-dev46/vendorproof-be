import mongoose, { Document } from 'mongoose';
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
export declare const VendorProfile: mongoose.Model<IVendorProfile, {}, {}, {}, mongoose.Document<unknown, {}, IVendorProfile, {}, mongoose.DefaultSchemaOptions> & IVendorProfile & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IVendorProfile>;
//# sourceMappingURL=vendorProfile.model.d.ts.map