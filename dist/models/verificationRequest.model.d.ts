import mongoose, { Document } from 'mongoose';
export type VerificationRequestStatus = 'pending_vendor_action' | 'in_progress' | 'trusted' | 'review' | 'blocked' | 'unverified' | 'expired';
export interface IVerificationRequest extends Document {
    requestCode: string;
    institutionId: mongoose.Types.ObjectId;
    vendorEmail?: string;
    vendorPhone?: string;
    vendorProfileId?: mongoose.Types.ObjectId;
    paymentAmount: number;
    paymentDescription: string;
    status: VerificationRequestStatus;
    trustScore?: number;
    verdict?: 'trusted' | 'review' | 'blocked';
    subScores?: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
    };
    verificationId?: mongoose.Types.ObjectId;
    guestVerified?: boolean;
    guestToken?: string;
    guestDetails?: {
        fullName?: string;
        phoneNumber?: string;
        bankAccount?: string;
        bankCode?: string;
        companyName?: string;
        rcNumber?: string;
    };
    expiresAt: Date;
    senderName?: string;
    paymentDate?: string;
    declinedAt?: Date;
    declineReason?: string;
    createdAt: Date;
}
export declare const VerificationRequest: mongoose.Model<IVerificationRequest, {}, {}, {}, mongoose.Document<unknown, {}, IVerificationRequest, {}, mongoose.DefaultSchemaOptions> & IVerificationRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IVerificationRequest>;
//# sourceMappingURL=verificationRequest.model.d.ts.map