import mongoose, { Document } from 'mongoose';
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
export declare const InstitutionProfile: mongoose.Model<IInstitutionProfile, {}, {}, {}, mongoose.Document<unknown, {}, IInstitutionProfile, {}, mongoose.DefaultSchemaOptions> & IInstitutionProfile & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IInstitutionProfile>;
//# sourceMappingURL=institutionProfile.model.d.ts.map