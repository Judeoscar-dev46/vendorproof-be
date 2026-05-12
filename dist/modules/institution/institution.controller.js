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
exports.createProfile = createProfile;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.getVerificationRequests = getVerificationRequests;
exports.getDashboard = getDashboard;
const zod_1 = require("zod");
const InstitutionService = __importStar(require("./institution.service"));
const CreateProfileSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(2, 'Business name is required'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    rcNumber: zod_1.z.string().regex(/^(RC|BN|IT|LLP|LP|CAC\/IT\/NO|IT\/NO\.)\s?\d{5,10}$/i, 'Invalid CAC registration number format'),
    email: zod_1.z.string().email('Invalid email address'),
    phoneNumber: zod_1.z.string().min(7, 'Phone number is required'),
    address: zod_1.z.string().min(5, 'Address is required'),
    unverifiedVendorPolicy: zod_1.z.enum(['block', 'review', 'allow', 'escalate']).optional(),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
});
const UpdateProfileSchema = CreateProfileSchema.omit({ rcNumber: true, password: true }).partial();
const PaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
});
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
        const { unverifiedVendorPolicy, password, ...required } = parsed.data;
        const profile = await InstitutionService.createInstitutionProfile({
            ...required,
            passwordRaw: password,
            ...(unverifiedVendorPolicy !== undefined && { unverifiedVendorPolicy }),
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
        const profile = await InstitutionService.getInstitutionProfile(req.params.id);
        return ok(res, profile);
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
        const profile = await InstitutionService.updateInstitutionProfile(req.params.id, data);
        return ok(res, profile);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
async function getVerificationRequests(req, res, next) {
    try {
        const parsed = PaginationSchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await InstitutionService.getInstitutionVerificationRequests(req.params.id, parsed.data.page, parsed.data.limit);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
async function getDashboard(req, res, next) {
    try {
        if (!req.user || req.user.role !== 'institution') {
            return fail(res, 'Unauthorized institution access', 403);
        }
        const result = await InstitutionService.getInstitutionDashboard(req.user.userId);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
//# sourceMappingURL=institution.controller.js.map