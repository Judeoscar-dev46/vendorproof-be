import mongoose, { Document } from 'mongoose';
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
export declare const Vendor: mongoose.Model<IVendor, {}, {}, {}, mongoose.Document<unknown, {}, IVendor, {}, mongoose.DefaultSchemaOptions> & IVendor & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IVendor>;
//# sourceMappingURL=vendor.model.d.ts.map