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
exports.uploadDocument = exports.uploadVerificationFiles = void 0;
exports.initiatePayment = initiatePayment;
exports.getPaymentStatus = getPaymentStatus;
exports.getVendorPayments = getVendorPayments;
exports.handleSquadWebhook = handleSquadWebhook;
exports.getBanks = getBanks;
exports.verifyPayment = verifyPayment;
exports.analyseScreenshot = analyseScreenshot;
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PaymentService = __importStar(require("./payment.service"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.uploadVerificationFiles = upload.fields([
    { name: 'document', maxCount: 1 },
]);
exports.uploadDocument = upload.single('document');
const InitiatePaymentSchema = zod_1.z.object({
    verificationId: zod_1.z.string().min(1, 'Verification ID is required'),
    amount: zod_1.z.number().positive('Amount must be greater than 0').optional(),
    narration: zod_1.z.string().max(100).optional(),
});
const VerifyPaymentSchema = zod_1.z.object({
    verificationId: zod_1.z.string().min(1, 'Verification ID is required'),
});
const AnalyseScreenshotSchema = zod_1.z.object({
    amount: zod_1.z.string().transform((val) => Number(val)).pipe(zod_1.z.number().positive('Amount must be greater than 0')),
    senderName: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
});
function ok(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
function fail(res, message, status = 400) {
    return res.status(status).json({ success: false, error: message });
}
async function initiatePayment(req, res, next) {
    try {
        const parsed = InitiatePaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await PaymentService.initiatePayment(parsed.data);
        return ok(res, result, 201);
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('Payment blocked'))
                return fail(res, err.message, 403);
            if (err.message.includes('already released'))
                return fail(res, err.message, 409);
            if (err.message.includes('not found'))
                return fail(res, err.message, 404);
            if (err.message.includes('Squad API error'))
                return fail(res, err.message, 502);
        }
        next(err);
    }
}
async function getPaymentStatus(req, res, next) {
    try {
        const result = await PaymentService.getPaymentStatus(req.params.verificationId);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
async function getVendorPayments(req, res, next) {
    try {
        const result = await PaymentService.getVendorPayments(req.params.vendorId);
        return ok(res, result);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
async function handleSquadWebhook(req, res, next) {
    try {
        const signature = req.headers['x-squad-signature'];
        if (!signature) {
            return fail(res, 'Missing webhook signature', 401);
        }
        await PaymentService.processWebhook(req.body, signature);
        return ok(res, { received: true });
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('Invalid webhook signature')) {
            return fail(res, 'Invalid webhook signature', 401);
        }
        next(err);
    }
}
async function getBanks(req, res, next) {
    try {
        const filePath = path_1.default.join(process.cwd(), 'bank.csv');
        const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        const banks = lines.map(line => {
            const match = line.match(/^(\d+)\s+(.+)$/);
            if (match && match[1] && match[2]) {
                return { code: match[1], name: match[2].trim() };
            }
            return null;
        }).filter(bank => bank !== null);
        return ok(res, banks);
    }
    catch (err) {
        next(err);
    }
}
async function verifyPayment(req, res, next) {
    try {
        const parsedData = VerifyPaymentSchema.safeParse(req.body);
        if (!parsedData.success) {
            return fail(res, parsedData.error.issues.map(e => e.message).join(', '));
        }
        const file = req.file;
        const { verificationId } = parsedData.data;
        if (!file) {
            return fail(res, 'File is required');
        }
        const result = await PaymentService.verifyPayment(verificationId, file);
        return ok(res, result, 200);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            return fail(res, error.message, 404);
        }
        next(error);
    }
}
async function analyseScreenshot(req, res, next) {
    try {
        const parsedData = AnalyseScreenshotSchema.safeParse(req.body);
        if (!parsedData.success) {
            return fail(res, parsedData.error.issues.map(e => e.message).join(', '));
        }
        const file = req.file;
        if (!file) {
            return fail(res, 'Screenshot file is required');
        }
        const result = await PaymentService.analyseTransfer(file, parsedData.data);
        return ok(res, result, 200);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=payment.controller.js.map