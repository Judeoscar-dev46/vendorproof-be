import mongoose, { Schema, Document } from 'mongoose';

export type AuditAction =
    | 'VENDOR_CREATED'
    | 'VENDOR_UPDATED'
    | 'VENDOR_DELETED'
    | 'VENDOR_STATUS_CHANGED'
    | 'VERIFICATION_STARTED'
    | 'VERIFICATION_COMPLETED'
    | 'PAYMENT_RELEASED'
    | 'PAYMENT_WEBHOOK'
    | 'LOGIN'
    | 'LOGIN_FAILED'
    | 'SESSION_BLOCKED'
    | 'WALLET_CREDITED'
    | 'WALLET_DEBITED';

export interface IAuditLog extends Document {
    action: AuditAction;
    vendorId?: mongoose.Types.ObjectId;
    performedBy?: mongoose.Types.ObjectId;
    referenceId?: string;
    ipAddress?: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        action: { type: String, required: true },
        vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile' },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        referenceId: { type: String },
        ipAddress: { type: String },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // logs are immutable
    }
);

AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ vendorId: 1 });
AuditLogSchema.index({ performedBy: 1 });
AuditLogSchema.index({ createdAt: -1 });

AuditLogSchema.pre('findOneAndUpdate', function () {
    throw new Error('Audit logs are immutable and cannot be updated');
});

AuditLogSchema.pre('updateOne', function () {
    throw new Error('Audit logs are immutable and cannot be updated');
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);