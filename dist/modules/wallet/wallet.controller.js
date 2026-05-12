"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletByOwner = exports.getWalletDetails = exports.createWallet = void 0;
const zod_1 = require("zod");
const wallet_service_1 = require("./wallet.service");
const CreateWalletSchema = zod_1.z.object({
    ownerId: zod_1.z.string().min(1, 'Owner ID is required'),
    ownerType: zod_1.z.enum(['individual', 'institution']),
    bvn: zod_1.z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits').optional(),
    address: zod_1.z.string().min(5, 'Address is required'),
    gender: zod_1.z.enum(['male', 'female']),
    email: zod_1.z.string().email('Invalid email').optional(),
    accountNumber: zod_1.z.string().regex(/^\d{10}$/, 'Account number must be 10 digits').optional(),
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
        const { accountNumber, bvn, email, ...required } = parsed.data;
        const wallet = await (0, wallet_service_1.createWallet)({
            ...required,
            ...(accountNumber !== undefined && { accountNumber }),
            ...(bvn !== undefined && { bvn }),
            ...(email !== undefined && { email }),
        });
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
//# sourceMappingURL=wallet.controller.js.map