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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocument = void 0;
exports.createRequest = createRequest;
exports.joinRequest = joinRequest;
exports.declineRequest = declineRequest;
exports.submitVerification = submitVerification;
exports.getRequestStatus = getRequestStatus;
exports.getDetails = getDetails;
exports.joinRequestGuest = joinRequestGuest;
exports.submitVerificationGuest = submitVerificationGuest;
exports.convertGuestAccount = convertGuestAccount;
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const VRService = __importStar(require("./verificationRequest.service"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.uploadDocument = upload.single('document');
const CreateRequestSchema = zod_1.z.object({
    institutionId: zod_1.z.string().min(1, 'Institution ID is required'),
    vendorEmail: zod_1.z.string().email('Invalid vendor email').optional(),
    vendorPhone: zod_1.z.string().min(7, 'Invalid vendor phone').optional(),
    paymentAmount: zod_1.z.number().positive('Payment amount must be positive'),
    paymentDescription: zod_1.z.string().min(1, 'Payment description is required'),
});
const JoinRequestSchema = zod_1.z.object({
    vendorProfileId: zod_1.z.string().min(1, 'Vendor profile ID is required'),
});
const DeclineRequestSchema = zod_1.z.object({
    vendorProfileId: zod_1.z.string().min(1, 'Vendor profile ID is required'),
    reason: zod_1.z.string().max(500).optional(),
});
const SubmitVerificationSchema = zod_1.z.object({
    vendorProfileId: zod_1.z.string().min(1, 'Vendor profile ID is required'),
    invoiceAmount: zod_1.z.coerce.number().positive().optional(),
});
const GetStatusSchema = zod_1.z.object({
    institutionId: zod_1.z.string().min(1, 'Institution ID is required'),
});
const JoinGuestSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1, 'Full name is required'),
    phoneNumber: zod_1.z.string().min(1, 'Phone number is required'),
});
const SubmitGuestSchema = zod_1.z.object({
    guestToken: zod_1.z.string().min(1, 'Guest token is required'),
    bvn: zod_1.z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
    bankAccount: zod_1.z.string().regex(/^\d{10}$/, 'Bank account must be exactly 10 digits'),
    bankCode: zod_1.z.string().min(1, 'Bank code is required'),
    companyName: zod_1.z.string().min(1, 'Company name is required'),
    rcNumber: zod_1.z.string().regex(/^(RC|BN|IT|LLP|LP|CAC\/IT\/NO|IT\/NO\.)\s?\d{5,10}$/i, 'Invalid CAC registration number format'),
    registrationDate: zod_1.z.string().min(1, 'Registration date is required'),
    address: zod_1.z.string().min(1, 'Address is required'),
    contactEmail: zod_1.z.string().email('Invalid email address'),
    invoiceAmount: zod_1.z.coerce.number().positive().optional(),
});
const ConvertGuestSchema = zod_1.z.object({
    guestToken: zod_1.z.string().min(1, 'Guest token is required'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    companyName: zod_1.z.string().min(1, 'Company name is required'),
    rcNumber: zod_1.z.string().regex(/^(RC|BN|IT|LLP|LP|CAC\/IT\/NO|IT\/NO\.)\s?\d{5,10}$/i, 'Invalid CAC registration number format'),
    directorBvn: zod_1.z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
    bankAccount: zod_1.z.string().regex(/^\d{10}$/, 'Bank account must be exactly 10 digits'),
    bankCode: zod_1.z.string().min(1, 'Bank code is required'),
    address: zod_1.z.string().min(1, 'Address is required'),
    registrationDate: zod_1.z.string().min(1, 'Registration date is required'),
    contactEmail: zod_1.z.string().email('Invalid email address'),
    phoneNumber: zod_1.z.string().min(1, 'Phone number is required'),
});
function ok(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
function fail(res, message, status = 400) {
    return res.status(status).json({ success: false, error: message });
}
async function createRequest(req, res, next) {
    try {
        const parsed = CreateRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const { institutionId, vendorEmail, vendorPhone, ...required } = parsed.data;
        if (!vendorEmail && !vendorPhone) {
            return fail(res, 'At least one of vendorEmail or vendorPhone is required');
        }
        const dto = {
            ...required,
            ...(vendorEmail !== undefined && { vendorEmail }),
            ...(vendorPhone !== undefined && { vendorPhone }),
        };
        const request = await VRService.createVerificationRequest(institutionId, dto);
        return ok(res, request, 201);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('required')) {
            return fail(res, err.message);
        }
        next(err);
    }
}
async function joinRequest(req, res, next) {
    try {
        const parsed = JoinRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await VRService.joinVerificationRequest(req.params.requestCode, parsed.data.vendorProfileId);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('not found'))
                return fail(res, err.message, 404);
            if (err.message.includes('expired'))
                return fail(res, err.message, 410);
            if (err.message.includes('already been actioned'))
                return fail(res, err.message, 409);
        }
        next(err);
    }
}
async function declineRequest(req, res, next) {
    try {
        const parsed = DeclineRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await VRService.declineVerificationRequest(req.params.requestCode, parsed.data.vendorProfileId, parsed.data.reason);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
async function submitVerification(req, res, next) {
    try {
        if (!req.file) {
            return fail(res, 'Document file is required');
        }
        const parsed = SubmitVerificationSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const base64 = req.file.buffer.toString('base64');
        const mediaType = req.file.mimetype;
        const result = await VRService.submitVendorVerification(req.params.requestCode, parsed.data.vendorProfileId, base64, mediaType, parsed.data.invoiceAmount);
        return ok(res, {
            trustScore: result.trustScore,
            verdict: result.verdict,
            subScores: result.subScores,
            verdictSummary: result.verdictSummary,
        });
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('not found'))
                return fail(res, err.message, 404);
            if (err.message.includes('expired'))
                return fail(res, err.message, 410);
            if (err.message.includes('not in progress'))
                return fail(res, err.message, 409);
        }
        next(err);
    }
}
async function getRequestStatus(req, res, next) {
    try {
        const parsed = GetStatusSchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await VRService.getRequestStatus(req.params.requestCode, parsed.data.institutionId);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
async function getDetails(req, res, next) {
    try {
        const result = await VRService.getRequestDetails(req.params.requestCode);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
async function joinRequestGuest(req, res, next) {
    try {
        const parsed = JoinGuestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await VRService.joinVerificationRequestAsGuest(req.params.requestCode, parsed.data);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('not found'))
                return fail(res, err.message, 404);
            if (err.message.includes('expired'))
                return fail(res, err.message, 410);
            if (err.message.includes('already been actioned'))
                return fail(res, err.message, 409);
        }
        next(err);
    }
}
async function submitVerificationGuest(req, res, next) {
    try {
        if (!req.file) {
            return fail(res, 'Document file is required');
        }
        const parsed = SubmitGuestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const base64 = req.file.buffer.toString('base64');
        const mediaType = req.file.mimetype;
        const { guestToken, invoiceAmount, ...guestDetails } = parsed.data;
        const result = await VRService.submitGuestVendorVerification(req.params.requestCode, guestToken, guestDetails, base64, mediaType, invoiceAmount);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('not found'))
                return fail(res, err.message, 404);
            if (err.message.includes('expired'))
                return fail(res, err.message, 410);
            if (err.message.includes('Invalid or expired'))
                return fail(res, err.message, 401);
        }
        next(err);
    }
}
async function convertGuestAccount(req, res, next) {
    try {
        const parsed = ConvertGuestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const { guestToken, ...accountDetails } = parsed.data;
        const result = await VRService.convertGuestToVendorProfile(req.params.requestCode, guestToken, accountDetails);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('No completed guest verification'))
                return fail(res, err.message, 404);
            if (err.message.includes('already exists'))
                return fail(res, err.message, 409);
        }
        next(err);
    }
}
//# sourceMappingURL=verificationRequest.controller.js.map