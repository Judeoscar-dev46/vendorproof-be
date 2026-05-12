import mongoose, { Document } from 'mongoose';
export interface IVerificationConsent extends Document {
    vendorProfileId: mongoose.Types.ObjectId;
    institutionId: mongoose.Types.ObjectId;
    requestCode: string;
    grantedAt: Date;
    expiresAt: Date;
    revokedAt?: Date;
    scoreAtConsent: number;
}
export declare const VerificationConsent: mongoose.Model<IVerificationConsent, {}, {}, {}, mongoose.Document<unknown, {}, IVerificationConsent, {}, mongoose.DefaultSchemaOptions> & IVerificationConsent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IVerificationConsent>;
//# sourceMappingURL=verificationConsent.model.d.ts.map