"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExpiryJob = startExpiryJob;
const node_cron_1 = __importDefault(require("node-cron"));
const verificationRequest_model_1 = require("../models/verificationRequest.model");
const transactionSession_model_1 = require("../models/transactionSession.model");
function startExpiryJob() {
    node_cron_1.default.schedule('*/15 * * * *', async () => {
        const now = new Date();
        await verificationRequest_model_1.VerificationRequest.updateMany({ expiresAt: { $lt: now }, status: { $in: ['pending_vendor_action', 'in_progress'] } }, { status: 'expired' });
        await transactionSession_model_1.TransactionSession.updateMany({ expiresAt: { $lt: now }, status: { $nin: ['payment_released', 'blocked', 'cancelled', 'expired'] } }, { status: 'expired' });
    });
}
//# sourceMappingURL=expireStaleRecords.js.map