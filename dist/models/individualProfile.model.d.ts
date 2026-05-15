import mongoose, { Document } from 'mongoose';
export interface IIndividualProfile extends Document {
    fullName: string;
    bvn?: string;
    ninNumber?: string;
    bankAccount?: string;
    bankCode?: string;
    phoneNumber?: string;
    dateOfBirth?: Date;
    email?: string;
    passwordHash: string;
    trustScore?: number;
    verificationStatus: 'unverified' | 'pending' | 'trusted' | 'review' | 'blocked';
    lastVerifiedAt?: Date;
    internalFlags: string[];
    createdAt: Date;
}
export declare const IndividualProfile: mongoose.Model<IIndividualProfile, {}, {}, {}, mongoose.Document<unknown, {}, IIndividualProfile, {}, mongoose.DefaultSchemaOptions> & IIndividualProfile & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IIndividualProfile>;
//# sourceMappingURL=individualProfile.model.d.ts.map