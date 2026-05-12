import mongoose, { Document } from 'mongoose';
export interface IVerification extends Document {
    vendorId?: mongoose.Types.ObjectId;
    subjectId?: mongoose.Types.ObjectId;
    subjectType?: 'vendor' | 'individual';
    trustScore: number;
    verdict: 'trusted' | 'review' | 'blocked';
    subScores: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
    };
    flags: string[];
    claudeReasoning: string;
    documentMetadata?: {
        extractedName?: string;
        extractedRcNumber?: string;
        nameMatch: boolean;
        rcMatch: boolean;
        documentType: string;
    };
    paymentReleased: boolean;
    squadTransactionRef?: string;
    createdAt: Date;
}
export declare const Verification: mongoose.Model<IVerification, {}, {}, {}, mongoose.Document<unknown, {}, IVerification, {}, mongoose.DefaultSchemaOptions> & IVerification & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IVerification>;
//# sourceMappingURL=verification.model.d.ts.map