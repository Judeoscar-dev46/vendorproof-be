import { AuditLog, IAuditLog } from '../../models/auditLog.model';

export async function getUserAuditLogs(
    userId: string,
    userType: string,
    page = 1,
    limit = 20
) {
    const skip = (page - 1) * limit;

    const query = {
        $or: [
            { performedBy: userId },
            { vendorId: userId },
            { 'metadata.ownerId': userId },
            { 'metadata.profileId': userId },
            { 'metadata.recipientProfileId': userId },
            { 'metadata.initiatorProfileId': userId },
        ],
    };

    const [logs, total] = await Promise.all([
        AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit).populate("metadata.ownerId"),
        AuditLog.countDocuments(query),
    ]);

    return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

export async function getAllAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        AuditLog.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        AuditLog.countDocuments(),
    ]);

    return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}
