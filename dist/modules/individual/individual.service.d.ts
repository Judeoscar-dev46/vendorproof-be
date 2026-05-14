import { IIndividualProfile } from '../../models/individualProfile.model';
import { SupportedMediaType } from '../../ai/documentAnalyser';
export interface CreateIndividualProfileDTO {
    fullName: string;
    bvn: string;
    ninNumber?: string;
    bankAccount: string;
    bankCode: string;
    phoneNumber: string;
    dateOfBirth: string;
    email?: string;
    passwordRaw: string;
}
export declare function createIndividualProfile(dto: CreateIndividualProfileDTO): Promise<IIndividualProfile>;
export declare function getIndividualProfile(id: string): Promise<IIndividualProfile>;
export declare function updateIndividualProfile(id: string, dto: Partial<Omit<CreateIndividualProfileDTO, 'bvn' | 'bankAccount'>>): Promise<IIndividualProfile>;
export declare function verifyIndividualProfileStandAlone(id: string, documentBase64: string, selfieBase64: string, mediaType: SupportedMediaType): Promise<{
    verificationId: import("mongoose").Types.ObjectId;
    trustScore: number;
    verdict: import("../../ai/scoreAggregator").Verdict;
    subScores: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
        faceScore?: number | undefined;
    };
    allFlags: string[];
    verdictSummary: string;
}>;
export declare function hasValidVerification(id: string): Promise<{
    valid: boolean;
    trustScore?: number;
    verdict?: 'trusted' | 'review' | 'blocked';
    verificationId?: string | undefined;
}>;
export declare function getIndividualVerificationHistory(id: string): Promise<{
    profile: import("mongoose").Document<unknown, {}, IIndividualProfile, {}, import("mongoose").DefaultSchemaOptions> & IIndividualProfile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    };
    verifications: (import("mongoose").Document<unknown, {}, import("../../models/verification.model").IVerification, {}, import("mongoose").DefaultSchemaOptions> & import("../../models/verification.model").IVerification & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[];
}>;
export declare function getIndividualDashboard(id: string): Promise<{
    profile: {
        fullName: string;
        verificationStatus: "trusted" | "review" | "blocked" | "unverified" | "pending";
        trustScore: number | undefined;
        lastVerifiedAt: Date | undefined;
    };
    stats: {
        walletBalance: number;
        verificationsCount: number;
        totalP2PVolume: number;
    };
    wallet: {
        accountNumber: string;
        bankCode: string;
        status: "active" | "inactive";
    } | null;
    recentVerifications: (import("mongoose").Document<unknown, {}, import("../../models/verification.model").IVerification, {}, import("mongoose").DefaultSchemaOptions> & import("../../models/verification.model").IVerification & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[];
    recentSessions: {
        sessionCode: string;
        amount: number;
        description: string;
        status: import("../../models/transactionSession.model").SessionStatus;
        role: string;
        otherParty: any;
        createdAt: Date;
    }[];
}>;
//# sourceMappingURL=individual.service.d.ts.map