import mongoose, { Document } from 'mongoose';
export type AuditAction = 'VENDOR_CREATED' | 'VENDOR_UPDATED' | 'VENDOR_DELETED' | 'VENDOR_STATUS_CHANGED' | 'VERIFICATION_STARTED' | 'VERIFICATION_COMPLETED' | 'PAYMENT_RELEASED' | 'PAYMENT_WEBHOOK' | 'LOGIN' | 'LOGIN_FAILED' | 'SESSION_BLOCKED' | 'WALLET_CREDITED' | 'WALLET_DEBITED';
export interface IAuditLog extends Document {
    action: AuditAction;
    vendorId?: mongoose.Types.ObjectId;
    performedBy?: mongoose.Types.ObjectId;
    referenceId?: string;
    ipAddress?: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
export declare const AuditLog: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, mongoose.DefaultSchemaOptions> & IAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAuditLog>;
//# sourceMappingURL=auditLog.model.d.ts.map