import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as SessionService from './transactionSession.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadDocument = upload.single('document');

const CreateSessionSchema = z.object({
    initiatorProfileId: z.string().min(1, 'Initiator profile ID is required'),
    recipientPhone: z.string().min(7).optional(),
    recipientEmail: z.string().email().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    description: z.string().min(1, 'Description is required').max(200),
});

const JoinSessionSchema = z.object({
    recipientProfileId: z.string().min(1, 'Recipient profile ID is required'),
});

const VerifySessionSchema = z.object({
    profileId: z.string().min(1, 'Profile ID is required'),
});

const ConsentSchema = z.object({
    profileId: z.string().min(1, 'Profile ID is required'),
});

const GetStatusSchema = z.object({
    profileId: z.string().min(1, 'Profile ID is required'),
});

function ok(res: Response, data: unknown, status = 200) {
    return res.status(status).json({ success: true, data });
}

function fail(res: Response, message: string, status = 400) {
    return res.status(status).json({ success: false, error: message });
}

export async function createSession(req: Request, res: Response, next: NextFunction) {
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
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('Provide recipient')) {
            return fail(res, err.message);
        }
        next(err);
    }
}

export async function joinSession(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = JoinSessionSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const session = await SessionService.joinTransactionSession(
            req.params.sessionCode as string,
            parsed.data.recipientProfileId
        );
        return ok(res, { sessionCode: session.sessionCode, status: session.status });
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('expired')) return fail(res, err.message, 410);
            if (err.message.includes('own session') || err.message.includes('no longer accepting')) {
                return fail(res, err.message, 409);
            }
        }
        next(err);
    }
}

export async function submitVerification(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            return fail(res, 'Identity document file is required');
        }

        const parsed = VerifySessionSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const base64 = req.file.buffer.toString('base64');
        const mediaType = req.file.mimetype as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';

        const result = await SessionService.submitSessionVerification(
            req.params.sessionCode as string,
            parsed.data.profileId,
            base64,
            mediaType
        );
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('expired')) return fail(res, err.message, 410);
            if (err.message.includes('not a participant')) return fail(res, err.message, 403);
            if (err.message.includes('already submitted')) return fail(res, err.message, 409);
        }
        next(err);
    }
}

export async function giveConsent(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = ConsentSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await SessionService.giveSessionConsent(
            req.params.sessionCode as string,
            parsed.data.profileId
        );
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('not a participant')) return fail(res, err.message, 403);
            if (err.message.includes('Cannot consent')) return fail(res, err.message, 409);
            if (err.message.includes('Insufficient balance') || err.message.includes('Account name mismatch')) {
                return fail(res, err.message, 402);
            }
        }
        next(err);
    }
}

export async function getSessionStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = GetStatusSchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await SessionService.getSessionStatus(
            req.params.sessionCode as string,
            parsed.data.profileId
        );
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('not a participant')) return fail(res, err.message, 403);
        }
        next(err);
    }
}
