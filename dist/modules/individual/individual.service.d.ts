import { IIndividualProfile } from '../../models/individualProfile.model';
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
//# sourceMappingURL=individual.service.d.ts.map