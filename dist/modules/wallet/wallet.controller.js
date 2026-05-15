"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateFunding = exports.getWalletByOwner = exports.getWalletDetails = exports.createWallet = void 0;
const zod_1 = require("zod");
const wallet_service_1 = require("./wallet.service");
const CreateWalletSchema = zod_1.z.object({
    ownerId: zod_1.z.string().min(1, 'Owner ID is required'),
    ownerType: zod_1.z.enum(['individual', 'institution']),
    bvn: zod_1.z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
    address: zod_1.z.string().min(5, 'Address is required'),
    gender: zod_1.z.enum(['male', 'female']),
    email: zod_1.z.string().email('Invalid email').optional(),
    accountNumber: zod_1.z.string().regex(/^\d{10}$/, 'Account number must be 10 digits').optional(),
    phoneNumber: zod_1.z.string().regex(/^(\+234|0)(70[0-9]|80[0-9]|81[0-9]|90[0-9]|91[0-9])\d{7}$/, 'Phone number must be a valid Nigerian format').optional(),
    dateOfBirth: zod_1.z.string().optional(),
    ninNumber: zod_1.z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 digits').optional(),
    bankAccount: zod_1.z.string().regex(/^\d{10}$/, 'Bank account must be exactly 10 digits').optional(),
    bankCode: zod_1.z.string().optional(),
});
const SimulateFundingSchema = zod_1.z.object({
    accountNumber: zod_1.z.string().min(1, 'Account number is required'),
    amount: zod_1.z.number().positive('Amount must be greater than 0'),
});
function ok(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
function fail(res, message, status = 400) {
    return res.status(status).json({ success: false, error: message });
}
const createWallet = async (req, res, next) => {
    try {
        const parsed = CreateWalletSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const wallet = await (0, wallet_service_1.createWallet)(parsed.data);
        return res.status(201).json({ success: true, data: wallet, message: 'Wallet created successfully' });
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return fail(res, err.message, 409);
        }
        next(err);
    }
};
exports.createWallet = createWallet;
const getWalletDetails = async (req, res, next) => {
    try {
        const wallet = await (0, wallet_service_1.getWalletById)(req.params.id);
        return res.status(200).json({ success: true, data: wallet, message: 'Wallet details retrieved successfully' });
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
};
exports.getWalletDetails = getWalletDetails;
const getWalletByOwner = async (req, res, next) => {
    try {
        const ownerType = req.query.ownerType;
        console.log(ownerType);
        if (ownerType !== 'individual' && ownerType !== 'institution') {
            return fail(res, 'ownerType must be "individual" or "institution"');
        }
        const wallet = await (0, wallet_service_1.getWalletByOwner)(req.params.ownerId, ownerType);
        return ok(res, wallet);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
};
exports.getWalletByOwner = getWalletByOwner;
const simulateFunding = async (req, res, next) => {
    try {
        const parsed = SimulateFundingSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await (0, wallet_service_1.simulateFunding)(parsed.data.accountNumber, parsed.data.amount);
        return ok(res, result);
    }
    catch (err) {
        next(err);
    }
};
exports.simulateFunding = simulateFunding;
//# sourceMappingURL=wallet.controller.js.map