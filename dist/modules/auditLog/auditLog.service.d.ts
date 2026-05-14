import { IAuditLog } from '../../models/auditLog.model';
export declare function getUserAuditLogs(userId: string, userType: string, page?: number, limit?: number): Promise<{
    logs: (import("mongoose").Document<unknown, {}, IAuditLog, {}, import("mongoose").DefaultSchemaOptions> & IAuditLog & Required<{
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
export declare function getAllAuditLogs(page?: number, limit?: number): Promise<{
    logs: (import("mongoose").Document<unknown, {}, IAuditLog, {}, import("mongoose").DefaultSchemaOptions> & IAuditLog & Required<{
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
//# sourceMappingURL=auditLog.service.d.ts.map