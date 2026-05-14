import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as PaymentService from './payment.service';
import fs from 'fs';
import path from 'path';

const InitiatePaymentSchema = z.object({
    verificationId: z.string().min(1, 'Verification ID is required'),
    amount: z.number().positive('Amount must be greater than 0').optional(),
    narration: z.string().max(100).optional(),
});

function ok(res: Response, data: unknown, status = 200) {
    return res.status(status).json({ success: true, data });
}

function fail(res: Response, message: string, status = 400) {
    return res.status(status).json({ success: false, error: message });
}

export async function initiatePayment(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = InitiatePaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }
        const result = await PaymentService.initiatePayment(parsed.data);
        return ok(res, result, 201);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('Payment blocked')) return fail(res, err.message, 403);
            if (err.message.includes('already released')) return fail(res, err.message, 409);
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('Squad API error')) return fail(res, err.message, 502);
        }
        next(err);
    }
}

export async function getPaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await PaymentService.getPaymentStatus(req.params.verificationId as string);
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}

export async function getVendorPayments(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await PaymentService.getVendorPayments(req.params.vendorId as string);
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}

export async function handleSquadWebhook(req: Request, res: Response, next: NextFunction) {
    try {
        const signature = req.headers['x-squad-signature'] as string;

        if (!signature) {
            return fail(res, 'Missing webhook signature', 401);
        }

        await PaymentService.processWebhook(req.body, signature);

        return ok(res, { received: true });
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('Invalid webhook signature')) {
            return fail(res, 'Invalid webhook signature', 401);
        }

        next(err);
    }
}

export async function getBanks(req: Request, res: Response, next: NextFunction) {
    try {
        const filePath = path.join(process.cwd(), 'bank.csv');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');

        const banks = lines.map(line => {
            const match = line.match(/^(\d+)\s+(.+)$/);
            if (match && match[1] && match[2]) {
                return { code: match[1], name: match[2].trim() };
            }
            return null;
        }).filter(bank => bank !== null);

        return ok(res, banks);
    } catch (err: unknown) {
        next(err);
    }
}