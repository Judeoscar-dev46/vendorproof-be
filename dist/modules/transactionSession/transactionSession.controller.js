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
exports.createSession = createSession;
exports.joinSession = joinSession;
exports.submitVerification = submitVerification;
exports.giveConsent = giveConsent;
exports.getSessionStatus = getSessionStatus;
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const SessionService = __importStar(require("./transactionSession.service"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.uploadDocument = upload.single('document');
const CreateSessionSchema = zod_1.z.object({
    initiatorProfileId: zod_1.z.string().min(1, 'Initiator profile ID is required'),
    recipientPhone: zod_1.z.string().min(7).optional(),
    recipientEmail: zod_1.z.string().email().optional(),
    amount: zod_1.z.number().positive('Amount must be greater than 0'),
    description: zod_1.z.string().min(1, 'Description is required').max(200),
});
const JoinSessionSchema = zod_1.z.object({
    recipientProfileId: zod_1.z.string().min(1, 'Recipient profile ID is required'),
});
const VerifySessionSchema = zod_1.z.object({
    profileId: zod_1.z.string().min(1, 'Profile ID is required'),
});
const ConsentSchema = zod_1.z.object({
    profileId: zod_1.z.string().min(1, 'Profile ID is required'),
});
const GetStatusSchema = zod_1.z.object({
    profileId: zod_1.z.string().min(1, 'Profile ID is required'),
});
function ok(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
function fail(res, message, status = 400) {
    return res.status(status).json({ success: false, error: message });
}
async function createSession(req, res, next) {
    try {
        const parsed = CreateSessionSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const { initiatorProfileId, recipientPhone, recipientEmail, ...required } = parsed.data;
        if (!recipientPhone && !recipientEmail) {
            return fail(res, 'Provide recipient phone or email');
        }
        const dto = {
            ...required,
            ...(recipientPhone !== undefined && { recipientPhone }),
            ...(recipientEmail !== undefined && { recipientEmail }),
        };
        const session = await SessionService.createTransactionSession(initiatorProfileId, dto);
        return ok(res, session, 201);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('Provide recipient')) {
            return fail(res, err.message);
        }
        next(err);
    }
}
async function joinSession(req, res, next) {
    try {
        const parsed = JoinSessionSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const session = await SessionService.joinTransactionSession(req.params.sessionCode, parsed.data.recipientProfileId);
        return ok(res, { sessionCode: session.sessionCode, status: session.status });
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('not found'))
                return fail(res, err.message, 404);
            if (err.message.includes('expired'))
                return fail(res, err.message, 410);
            if (err.message.includes('own session') || err.message.includes('no longer accepting')) {
                return fail(res, err.message, 409);
            }
        }
        next(err);
    }
}
async function submitVerification(req, res, next) {
    try {
        if (!req.file) {
            return fail(res, 'Identity document file is required');
        }
        const parsed = VerifySessionSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const base64 = req.file.buffer.toString('base64');
        const mediaType = req.file.mimetype;
        const result = await SessionService.submitSessionVerification(req.params.sessionCode, parsed.data.profileId, base64, mediaType);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('not found'))
                return fail(res, err.message, 404);
            if (err.message.includes('expired'))
                return fail(res, err.message, 410);
            if (err.message.includes('not a participant'))
                return fail(res, err.message, 403);
            if (err.message.includes('already submitted'))
                return fail(res, err.message, 409);
        }
        next(err);
    }
}
async function giveConsent(req, res, next) {
    try {
        const parsed = ConsentSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await SessionService.giveSessionConsent(req.params.sessionCode, parsed.data.profileId);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('not found'))
                return fail(res, err.message, 404);
            if (err.message.includes('not a participant'))
                return fail(res, err.message, 403);
            if (err.message.includes('Cannot consent'))
                return fail(res, err.message, 409);
            if (err.message.includes('Insufficient balance') || err.message.includes('Account name mismatch')) {
                return fail(res, err.message, 402);
            }
        }
        next(err);
    }
}
async function getSessionStatus(req, res, next) {
    try {
        const parsed = GetStatusSchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await SessionService.getSessionStatus(req.params.sessionCode, parsed.data.profileId);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('not found'))
                return fail(res, err.message, 404);
            if (err.message.includes('not a participant'))
                return fail(res, err.message, 403);
        }
        next(err);
    }
}
//# sourceMappingURL=transactionSession.controller.js.map