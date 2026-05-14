"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAuditLogs = getUserAuditLogs;
exports.getAllAuditLogs = getAllAuditLogs;
const auditLog_model_1 = require("../../models/auditLog.model");
async function getUserAuditLogs(userId, userType, page = 1, limit = 20) {
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
        auditLog_model_1.AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit).populate("metadata.ownerId"),
        auditLog_model_1.AuditLog.countDocuments(query),
    ]);
    return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}
async function getAllAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        auditLog_model_1.AuditLog.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        auditLog_model_1.AuditLog.countDocuments(),
    ]);
    return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}
//# sourceMappingURL=auditLog.service.js.map