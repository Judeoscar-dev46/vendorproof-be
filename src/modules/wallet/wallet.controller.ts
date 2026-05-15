import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
    createWallet as createWalletService,
    getWalletById,
    getWalletByOwner as getWalletByOwnerService,
    simulateFunding as simulateFundingService,
} from './wallet.service';

const CreateWalletSchema = z.object({
    ownerId: z.string().min(1, 'Owner ID is required'),
    ownerType: z.enum(['individual', 'institution']),
    bvn: z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits').optional(),
    address: z.string().min(5, 'Address is required'),
    gender: z.enum(['male', 'female']),
    email: z.string().email('Invalid email').optional(),
    accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits').optional(),
});

const SimulateFundingSchema = z.object({
    accountNumber: z.string().min(1, 'Account number is required'),
    amount: z.number().positive('Amount must be greater than 0'),
});

function ok(res: Response, data: unknown, status = 200) {
    return res.status(status).json({ success: true, data });
}

function fail(res: Response, message: string, status = 400) {
    return res.status(status).json({ success: false, error: message });
}

export const createWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = CreateWalletSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const { accountNumber, bvn, email, ...required } = parsed.data;
        const wallet = await createWalletService({
            ...required,
            ...(accountNumber !== undefined && { accountNumber }),
            ...(bvn !== undefined && { bvn }),
            ...(email !== undefined && { email }),
        });

        return res.status(201).json({ success: true, data: wallet, message: 'Wallet created successfully' });
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return fail(res, err.message, 409);
        }
        next(err);
    }
};

export const getWalletDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const wallet = await getWalletById(req.params.id as string);
        return res.status(200).json({ success: true, data: wallet, message: 'Wallet details retrieved successfully' });
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
};

export const getWalletByOwner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ownerType = req.query.ownerType as string;
        console.log(ownerType);
        if (ownerType !== 'individual' && ownerType !== 'institution') {
            return fail(res, 'ownerType must be "individual" or "institution"');
        }

        const wallet = await getWalletByOwnerService(req.params.ownerId as string, ownerType);
        return ok(res, wallet);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
};

export const simulateFunding = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log(req.body)
        const parsed = SimulateFundingSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await simulateFundingService(parsed.data.accountNumber, parsed.data.amount);
        return ok(res, result);
    } catch (err: unknown) {
        next(err);
    }
};
