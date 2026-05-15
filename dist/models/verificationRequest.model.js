"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationRequest = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VerificationRequestSchema = new mongoose_1.Schema({
    requestCode: { type: String, required: true, unique: true },
    institutionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'InstitutionProfile', required: true },
    vendorEmail: String,
    vendorPhone: String,
    vendorProfileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'VendorProfile' },
    paymentAmount: { type: Number, required: true },
    paymentDescription: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending_vendor_action', 'in_progress', 'trusted', 'review', 'blocked', 'unverified', 'expired'],
        default: 'pending_vendor_action',
    },
    trustScore: Number,
    verdict: { type: String, enum: ['trusted', 'review', 'blocked'] },
    subScores: {
        documentScore: Number,
        anomalyScore: Number,
        networkScore: Number,
    },
    verificationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Verification' },
    guestVerified: { type: Boolean, default: false },
    guestToken: { type: String, select: false },
    guestDetails: {
        fullName: String,
        phoneNumber: String,
        bankAccount: String,
        bankCode: String,
        companyName: String,
        rcNumber: String,
    },
    expiresAt: { type: Date, required: true },
    senderName: String,
    paymentDate: String,
    declinedAt: Date,
    declineReason: String,
}, { timestamps: true });
VerificationRequestSchema.index({ institutionId: 1 });
VerificationRequestSchema.index({ status: 1 });
VerificationRequestSchema.index({ expiresAt: 1 });
exports.VerificationRequest = mongoose_1.default.model('VerificationRequest', VerificationRequestSchema);
//# sourceMappingURL=verificationRequest.model.js.map