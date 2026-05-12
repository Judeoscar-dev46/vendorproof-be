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
exports.VendorProfile = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VendorProfileSchema = new mongoose_1.Schema({
    companyName: { type: String, required: true },
    rcNumber: { type: String, required: true, unique: true },
    directorBvn: { type: String, required: true, select: false },
    bankAccount: { type: String, required: true, select: false },
    bankCode: { type: String, required: true },
    address: { type: String, required: true },
    registrationDate: { type: Date, required: true },
    contactEmail: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    passwordHash: { type: String, select: false },
    trustScore: Number,
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'trusted', 'review', 'blocked'],
        default: 'unverified',
    },
    lastVerifiedAt: Date,
    internalFlags: [String],
}, { timestamps: true });
VendorProfileSchema.index({ bankAccount: 1 });
VendorProfileSchema.index({ directorBvn: 1 });
exports.VendorProfile = mongoose_1.default.model('VendorProfile', VendorProfileSchema);
//# sourceMappingURL=vendorProfile.model.js.map