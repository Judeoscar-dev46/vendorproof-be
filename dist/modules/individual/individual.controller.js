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
exports.uploadVerificationFiles = void 0;
exports.createProfile = createProfile;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.verifyProfile = verifyProfile;
exports.getDashboard = getDashboard;
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const IndividualService = __importStar(require("./individual.service"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.uploadVerificationFiles = upload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]);
const CreateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, 'Full name is required'),
    bvn: zod_1.z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
    ninNumber: zod_1.z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 digits').optional(),
    bankAccount: zod_1.z.string().regex(/^\d{10}$/, 'Bank account must be exactly 10 digits'),
    bankCode: zod_1.z.string().min(3, 'Bank code is required'),
    phoneNumber: zod_1.z.string().regex(/^(\+234|0)(70[0-9]|80[0-9]|81[0-9]|90[0-9]|91[0-9])\d{7}$/, 'Phone number must be a valid Nigerian format'),
    dateOfBirth: zod_1.z.string().transform((v, ctx) => {
        const dmyMatch = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
        if (dmyMatch) {
            const isoStr = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
            if (!isNaN(Date.parse(isoStr)))
                return isoStr;
        }
        const ymdMatch = v.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
        if (ymdMatch && !isNaN(Date.parse(v)))
            return v;
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'Invalid date. Use DD/MM/YYYY or YYYY-MM-DD' });
        return zod_1.z.NEVER;
    }),
    email: zod_1.z.string().email('Invalid email').optional(),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
});
const UpdateProfileSchema = CreateProfileSchema
    .omit({ bvn: true, bankAccount: true, password: true })
    .partial();
function ok(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
function fail(res, message, status = 400) {
    return res.status(status).json({ success: false, error: message });
}
async function createProfile(req, res, next) {
    try {
        const parsed = CreateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const { ninNumber, email, password, ...required } = parsed.data;
        const profile = await IndividualService.createIndividualProfile({
            ...required,
            passwordRaw: password,
            ...(ninNumber !== undefined && { ninNumber }),
            ...(email !== undefined && { email }),
        });
        return ok(res, profile, 201);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return fail(res, err.message, 409);
        }
        next(err);
    }
}
async function getProfile(req, res, next) {
    try {
        const { withHistory } = req.query;
        const data = withHistory === 'true'
            ? await IndividualService.getIndividualVerificationHistory(req.params.id)
            : await IndividualService.getIndividualProfile(req.params.id);
        return ok(res, data);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
async function updateProfile(req, res, next) {
    try {
        const parsed = UpdateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const data = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
        const profile = await IndividualService.updateIndividualProfile(req.params.id, data);
        return ok(res, profile);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
async function verifyProfile(req, res, next) {
    try {
        const files = req.files;
        if (!files?.document?.[0]) {
            return fail(res, 'Identity document file is required');
        }
        if (!files?.selfie?.[0]) {
            return fail(res, 'Selfie image is required for face recognition');
        }
        const docBase64 = files.document[0].buffer.toString('base64');
        const docMediaType = files.document[0].mimetype;
        const selfieBase64 = files.selfie[0].buffer.toString('base64');
        const result = await IndividualService.verifyIndividualProfileStandAlone(req.params.id, docBase64, selfieBase64, docMediaType);
        return ok(res, result);
    }
    catch (err) {
        next(err);
    }
}
async function getDashboard(req, res, next) {
    try {
        const id = req.params.id || req.user?.userId;
        if (!id)
            return fail(res, 'Profile ID is required', 400);
        const data = await IndividualService.getIndividualDashboard(id);
        return ok(res, data);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
//# sourceMappingURL=individual.controller.js.map