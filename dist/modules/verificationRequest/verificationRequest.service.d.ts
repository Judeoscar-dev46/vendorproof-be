import mongoose from 'mongoose';
import { SupportedMediaType } from '../../ai/documentAnalyser';
export declare function createVerificationRequest(institutionId: string, dto: {
    vendorEmail?: string;
    vendorPhone?: string;
    paymentAmount: number;
    paymentDescription: string;
}): Promise<mongoose.Document<unknown, {}, import("../../models/verificationRequest.model").IVerificationRequest, {}, mongoose.DefaultSchemaOptions> & import("../../models/verificationRequest.model").IVerificationRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}>;
export declare function joinVerificationRequest(requestCode: string, vendorProfileId: string): Promise<{
    reusedExistingProfile: boolean;
    request: mongoose.Document<unknown, {}, import("../../models/verificationRequest.model").IVerificationRequest, {}, mongoose.DefaultSchemaOptions> & import("../../models/verificationRequest.model").IVerificationRequest & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    };
}>;
export declare function declineVerificationRequest(requestCode: string, vendorProfileId: string, reason?: string): Promise<{
    message: string;
}>;
export declare function submitVendorVerification(requestCode: string, vendorProfileId: string, documentBase64: string, mediaType: SupportedMediaType, invoiceAmount?: number): Promise<{
    verificationId: mongoose.Types.ObjectId;
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
export declare function getRequestStatus(requestCode: string, institutionId: string): Promise<{
    requestCode: string;
    status: import("../../models/verificationRequest.model").VerificationRequestStatus;
    paymentAmount: number;
    paymentDescription: string;
    trustScore: number | undefined;
    verdict: "trusted" | "review" | "blocked" | undefined;
    subScores: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
    } | undefined;
    expiresAt: Date;
    createdAt: Date;
}>;
export declare function getRequestDetails(requestCode: string): Promise<{
    requestCode: string;
    paymentAmount: number;
    paymentDescription: string;
    institutionName: any;
    expiresAt: Date;
    status: import("../../models/verificationRequest.model").VerificationRequestStatus;
    verification: mongoose.Types.ObjectId | undefined;
}>;
export declare function joinVerificationRequestAsGuest(requestCode: string, guestDetails: {
    fullName: string;
    phoneNumber: string;
}): Promise<{
    isGuest: boolean;
    vendorProfileId: string;
    message: string;
    guestToken?: never;
} | {
    isGuest: boolean;
    guestToken: string;
    message: string;
    vendorProfileId?: never;
}>;
export declare function submitGuestVendorVerification(requestCode: string, guestToken: string, guestDetails: {
    bvn: string;
    bankAccount: string;
    bankCode: string;
    companyName: string;
    rcNumber: string;
    registrationDate: string;
    address: string;
    contactEmail: string;
}, documentBase64: string, mediaType: SupportedMediaType, invoiceAmount?: number): Promise<{
    trustScore: number;
    verdict: import("../../ai/scoreAggregator").Verdict;
    verdictSummary: string;
    subScores: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
        faceScore?: number | undefined;
    };
    canCreateAccount: boolean;
    prefillData: {
        fullName: string | undefined;
        companyName: string;
        rcNumber: string;
        email: string;
        phoneNumber: string | undefined;
    };
}>;
export declare function convertGuestToVendorProfile(requestCode: string, guestToken: string, accountDetails: {
    password: string;
    companyName: string;
    rcNumber: string;
    directorBvn: string;
    bankAccount: string;
    bankCode: string;
    address: string;
    registrationDate: string;
    contactEmail: string;
    phoneNumber: string;
}): Promise<{
    vendorProfile: import("../../models/vendorProfile.model").IVendorProfile & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    };
    token: string;
}>;
export declare function getAllInstitutionRequests(institutionId: string, page?: number, limit?: number, status?: string, search?: string): Promise<{
    stats: any;
    requests: {
        requestCode: string;
        vendorName: any;
        vendorEmail: any;
        paymentAmount: number;
        trustScore: number | null;
        status: import("../../models/verificationRequest.model").VerificationRequestStatus;
        verdict: "trusted" | "review" | "blocked" | null;
        createdAt: Date;
    }[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;
export declare function getInstitutionRequestDetails(requestCode: string, institutionId: string): Promise<{
    requestCode: string;
    status: import("../../models/verificationRequest.model").VerificationRequestStatus;
    paymentAmount: number;
    paymentDescription: string;
    createdAt: Date;
    expiresAt: Date;
    declinedAt: Date | undefined;
    declineReason: string | undefined;
    vendorName: any;
    vendorEmail: any;
    vendorPhone: any;
    vendorProfileId: any;
    isGuest: boolean;
    trustScore: number | undefined;
    verdict: "trusted" | "review" | "blocked" | undefined;
    subScores: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
    } | undefined;
    verificationId: mongoose.Types.ObjectId | undefined;
    verification: any;
    vendorJoinedAt: any;
}>;
export declare function approveVerificationRequest(requestCode: string, institutionId: string): Promise<{
    message: string;
}>;
//# sourceMappingURL=verificationRequest.service.d.ts.map