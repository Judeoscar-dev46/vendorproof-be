import { SupportedMediaType } from './documentAnalyser';
import { IVendorProfile } from '../models/vendorProfile.model';
import { IIndividualProfile } from '../models/individualProfile.model';
export declare function runVendorVerification(vendor: IVendorProfile, documentBase64: string, mediaType: SupportedMediaType, invoiceAmount?: number): Promise<{
    verificationId: import("mongoose").Types.ObjectId;
    trustScore: number;
    verdict: import("./scoreAggregator").Verdict;
    subScores: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
    };
    allFlags: string[];
    verdictSummary: string;
}>;
export declare function runIndividualVerification(profile: IIndividualProfile, documentBase64: string, mediaType: SupportedMediaType, transactionAmount?: number): Promise<{
    verificationId: import("mongoose").Types.ObjectId;
    trustScore: number;
    verdict: import("./scoreAggregator").Verdict;
    subScores: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
    };
    allFlags: string[];
    verdictSummary: string;
}>;
//# sourceMappingURL=orchestrator.d.ts.map