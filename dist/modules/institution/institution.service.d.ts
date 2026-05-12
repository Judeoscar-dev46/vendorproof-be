import { IInstitutionProfile } from '../../models/institutionProfile.model';
export declare function getInstitutionDashboard(institutionId: string): Promise<{
    institution: {
        id: import("mongoose").Types.ObjectId;
        name: string;
        rcNumber: string;
        email: string;
        unverifiedVendorPolicy: "review" | "block" | "allow" | "escalate";
    };
    wallet: {
        internalBalance: number;
        currency: string;
    };
    stats: any;
    recentRequests: {
        requestCode: string;
        vendorName: any;
        paymentAmount: number;
        status: import("../../models/verificationRequest.model").VerificationRequestStatus;
        trustScore: number | null;
        verdict: "trusted" | "review" | "blocked" | null;
        createdAt: Date;
    }[];
}>;
export interface CreateInstitutionProfileDTO {
    businessName: string;
    firstName: string;
    lastName: string;
    rcNumber: string;
    email: string;
    phoneNumber: string;
    address: string;
    unverifiedVendorPolicy?: 'block' | 'review' | 'allow' | 'escalate';
    passwordRaw: string;
}
export declare function createInstitutionProfile(dto: CreateInstitutionProfileDTO): Promise<IInstitutionProfile>;
export declare function getInstitutionProfile(id: string): Promise<IInstitutionProfile>;
export declare function updateInstitutionProfile(id: string, dto: Partial<CreateInstitutionProfileDTO>): Promise<IInstitutionProfile>;
export declare function getInstitutionVerificationRequests(institutionId: string, page?: number, limit?: number): Promise<{
    requests: (import("mongoose").Document<unknown, {}, import("../../models/verificationRequest.model").IVerificationRequest, {}, import("mongoose").DefaultSchemaOptions> & import("../../models/verificationRequest.model").IVerificationRequest & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[];
    total: number;
    page: number;
    totalPages: number;
}>;
//# sourceMappingURL=institution.service.d.ts.map