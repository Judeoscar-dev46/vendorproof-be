import { IAdmin } from '../../models/admin.model';
export interface RegisterDTO {
    name: string;
    email: string;
    passwordRaw: string;
    role: 'admin' | 'officer' | 'viewer';
}
export interface LoginDTO {
    identifier: string;
    passwordRaw: string;
    userType: 'admin' | 'individual' | 'institution' | 'vendor';
}
export declare function registerAdmin(dto: RegisterDTO): Promise<IAdmin & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function login(dto: LoginDTO): Promise<{
    token: string;
    user: any;
    userType: "admin" | "individual" | "institution" | "vendor";
}>;
//# sourceMappingURL=auth.service.d.ts.map