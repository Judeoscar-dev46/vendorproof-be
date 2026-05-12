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
exports.registerAdmin = registerAdmin;
exports.login = login;
const zod_1 = require("zod");
const AuthService = __importStar(require("./auth.service"));
const env_1 = require("../../config/env");
const RegisterSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    role: zod_1.z.enum(['admin', 'officer', 'viewer']),
    setupToken: zod_1.z.string().optional(),
});
const LoginSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1, 'Email or phone number is required').optional(),
    email: zod_1.z.string().email('Invalid email address').optional(),
    password: zod_1.z.string().min(1, 'Password is required'),
    userType: zod_1.z.enum(['admin', 'individual', 'institution', 'vendor']).default('admin'),
}).refine(data => data.identifier || data.email, {
    message: 'Either identifier or email is required',
    path: ['identifier'],
});
function ok(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
function fail(res, message, status = 400) {
    return res.status(status).json({ success: false, error: message });
}
async function registerAdmin(req, res, next) {
    try {
        const parsed = RegisterSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const { setupToken, ...dto } = parsed.data;
        if (setupToken) {
            if (setupToken !== env_1.env.ADMIN_SETUP_TOKEN) {
                return fail(res, 'Invalid setup token', 403);
            }
        }
        else {
            if (!req.user || req.user.role !== 'admin') {
                return fail(res, 'Unauthorized to create admin accounts. Provide a valid setup token or login as an admin.', 403);
            }
        }
        const newAdmin = await AuthService.registerAdmin({
            name: dto.name,
            email: dto.email,
            passwordRaw: dto.password,
            role: dto.role,
        });
        return ok(res, newAdmin, 201);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return fail(res, err.message, 409);
        }
        next(err);
    }
}
async function login(req, res, next) {
    try {
        const parsed = LoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await AuthService.login({
            identifier: parsed.data.identifier || parsed.data.email,
            passwordRaw: parsed.data.password,
            userType: parsed.data.userType,
        });
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error && err.message === 'Invalid email or password') {
            return fail(res, err.message, 401);
        }
        next(err);
    }
}
//# sourceMappingURL=auth.controller.js.map