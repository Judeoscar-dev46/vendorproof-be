import { IVendorProfile } from '../../models/vendorProfile.model';
export interface CreateVendorDTO {
    companyName: string;
    rcNumber: string;
    directorBvn: string;
    bankAccount: string;
    bankCode: string;
    address: string;
    registrationDate: Date;
    contactEmail: string;
    phoneNumber: string;
}
export interface VendorFilters {
    status?: IVendorProfile['verificationStatus'] | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}
export declare function createVendor(dto: CreateVendorDTO): Promise<IVendorProfile>;
export declare function getVendorById(id: string): Promise<IVendorProfile>;
export declare function getAllVendors(filters: VendorFilters): Promise<{
    vendors: IVendorProfile[];
    total: number;
    page: number;
    totalPages: number;
}>;
export declare function updateVendorStatus(id: string, status: IVendorProfile['verificationStatus'], reason?: string): Promise<IVendorProfile>;
export declare function deleteVendor(id: string): Promise<void>;
export declare function getVendorWithVerifications(id: string): Promise<{
    vendor: import("mongoose").Document<unknown, {}, IVendorProfile, {}, import("mongoose").DefaultSchemaOptions> & IVendorProfile & Required<{
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
//# sourceMappingURL=vendor.service.d.ts.map