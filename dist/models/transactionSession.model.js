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
exports.TransactionSession = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TransactionSessionSchema = new mongoose_1.Schema({
    sessionCode: { type: String, required: true, unique: true },
    initiatorProfileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'IndividualProfile', required: true },
    recipientPhone: String,
    recipientEmail: String,
    recipientProfileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'IndividualProfile' },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    status: {
        type: String,
        enum: [
            'awaiting_recipient', 'both_verifying',
            'initiator_verified', 'recipient_verified', 'both_verified',
            'awaiting_initiator_consent', 'awaiting_recipient_consent',
            'awaiting_both_consent', 'payment_released',
            'blocked', 'cancelled', 'expired',
        ],
        default: 'awaiting_recipient',
    },
    initiatorVerificationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Verification' },
    recipientVerificationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Verification' },
    initiatorTrustScore: Number,
    recipientTrustScore: Number,
    initiatorVerdict: { type: String, enum: ['trusted', 'review', 'blocked'] },
    recipientVerdict: { type: String, enum: ['trusted', 'review', 'blocked'] },
    initiatorConsented: { type: Boolean, default: false },
    recipientConsented: { type: Boolean, default: false },
    squadTransactionRef: String,
    paymentReleasedAt: Date,
    blockedReason: String,
    expiresAt: { type: Date, required: true },
    guestDetails: {
        fullName: String,
        phoneNumber: String,
        bvn: String,
        bankAccount: String,
        bankCode: String,
        dateOfBirth: Date,
    },
    guestToken: String,
}, { timestamps: true });
TransactionSessionSchema.index({ initiatorProfileId: 1 });
TransactionSessionSchema.index({ recipientProfileId: 1 });
TransactionSessionSchema.index({ expiresAt: 1 });
exports.TransactionSession = mongoose_1.default.model('TransactionSession', TransactionSessionSchema);
//# sourceMappingURL=transactionSession.model.js.map