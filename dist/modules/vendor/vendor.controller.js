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
exports.createVendor = createVendor;
exports.getVendor = getVendor;
exports.getAllVendors = getAllVendors;
exports.updateVendorStatus = updateVendorStatus;
exports.deleteVendor = deleteVendor;
const zod_1 = require("zod");
const VendorService = __importStar(require("./vendor.service"));
const CreateVendorSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(2, 'Company name is required'),
    rcNumber: zod_1.z.string().regex(/^(RC|BN|IT|LLP|LP|CAC\/IT\/NO|IT\/NO\.)\s?\d{5,10}$/i, 'Invalid CAC registration number format'),
    directorBvn: zod_1.z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
    bankAccount: zod_1.z.string().regex(/^\d{10}$/, 'Bank account must be exactly 10 digits'),
    bankCode: zod_1.z.string().min(3, 'Bank code is required'),
    address: zod_1.z.string().min(5, 'Address is required'),
    registrationDate: zod_1.z.string().transform((v, ctx) => {
        const dmyMatch = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
        if (dmyMatch) {
            const isoStr = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
            const date = new Date(isoStr);
            if (!isNaN(date.getTime()))
                return date;
        }
        const ymdMatch = v.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
        if (ymdMatch) {
            const date = new Date(v);
            if (!isNaN(date.getTime()))
                return date;
        }
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'Invalid date. Use DD/MM/YYYY or YYYY-MM-DD' });
        return zod_1.z.NEVER;
    }),
    contactEmail: zod_1.z.string().email('Invalid email address'),
});
const UpdateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'trusted', 'review', 'blocked']),
    reason: zod_1.z.string().optional(),
});
const VendorFiltersSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'trusted', 'review', 'blocked']).optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
});
function ok(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
function fail(res, message, status = 400) {
    return res.status(status).json({ success: false, error: message });
}
async function createVendor(req, res, next) {
    try {
        const parsed = CreateVendorSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const vendor = await VendorService.createVendor(parsed.data);
        return ok(res, vendor, 201);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return fail(res, err.message, 409);
        }
        next(err);
    }
}
async function getVendor(req, res, next) {
    try {
        const { withVerifications } = req.query;
        const data = withVerifications === 'true'
            ? await VendorService.getVendorWithVerifications(req.params.id)
            : await VendorService.getVendorById(req.params.id);
        return ok(res, data);
    }
    catch (err) {
        if (err instanceof Error && err.message === 'Vendor not found') {
            return fail(res, 'Vendor not found', 404);
        }
        next(err);
    }
}
async function getAllVendors(req, res, next) {
    try {
        const parsed = VendorFiltersSchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await VendorService.getAllVendors(parsed.data);
        return ok(res, result);
    }
    catch (err) {
        next(err);
    }
}
async function updateVendorStatus(req, res, next) {
    try {
        const parsed = UpdateStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const vendor = await VendorService.updateVendorStatus(req.params.id, parsed.data.status, parsed.data.reason);
        return ok(res, vendor);
    }
    catch (err) {
        if (err instanceof Error && err.message === 'Vendor not found') {
            return fail(res, 'Vendor not found', 404);
        }
        next(err);
    }
}
async function deleteVendor(req, res, next) {
    try {
        await VendorService.deleteVendor(req.params.id);
        return ok(res, { message: 'Vendor deleted successfully' });
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message === 'Vendor not found')
                return fail(res, err.message, 404);
            if (err.message.includes('Cannot delete'))
                return fail(res, err.message, 403);
        }
        next(err);
    }
}
//# sourceMappingURL=vendor.controller.js.map