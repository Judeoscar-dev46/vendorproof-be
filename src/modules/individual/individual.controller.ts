import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as IndividualService from './individual.service';
import { SupportedMediaType } from '../../ai/documentAnalyser';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadVerificationFiles = upload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]);

const CreateProfileSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    bvn: z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
    ninNumber: z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 digits').optional(),
    bankAccount: z.string().regex(/^\d{10}$/, 'Bank account must be exactly 10 digits'),
    bankCode: z.string().min(3, 'Bank code is required'),
    phoneNumber: z.string().regex(
        /^(\+234|0)(70[0-9]|80[0-9]|81[0-9]|90[0-9]|91[0-9])\d{7}$/,
        'Phone number must be a valid Nigerian format'
    ),
    dateOfBirth: z.string().transform((v, ctx) => {
        const dmyMatch = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
        if (dmyMatch) {
            const isoStr = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
            if (!isNaN(Date.parse(isoStr))) return isoStr;
        }
        const ymdMatch = v.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
        if (ymdMatch && !isNaN(Date.parse(v))) return v;

        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date. Use DD/MM/YYYY or YYYY-MM-DD' });
        return z.NEVER;
    }),
    email: z.string().email('Invalid email').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const UpdateProfileSchema = CreateProfileSchema
    .omit({ bvn: true, bankAccount: true, password: true })
    .partial();

function ok(res: Response, data: unknown, status = 200) {
    return res.status(status).json({ success: true, data });
}

function fail(res: Response, message: string, status = 400) {
    return res.status(status).json({ success: false, error: message });
}

export async function createProfile(req: Request, res: Response, next: NextFunction) {
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
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return fail(res, err.message, 409);
        }
        next(err);
    }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { withHistory } = req.query;

        const data = withHistory === 'true'
            ? await IndividualService.getIndividualVerificationHistory(req.params.id as string)
            : await IndividualService.getIndividualProfile(req.params.id as string);

        return ok(res, data);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = UpdateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const data = Object.fromEntries(
            Object.entries(parsed.data).filter(([, v]) => v !== undefined)
        ) as Parameters<typeof IndividualService.updateIndividualProfile>[1];
        const profile = await IndividualService.updateIndividualProfile(
            req.params.id as string,
            data
        );
        return ok(res, profile);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}

export async function verifyProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (!files?.document?.[0]) {
            return fail(res, 'Identity document file is required');
        }
        if (!files?.selfie?.[0]) {
            return fail(res, 'Selfie image is required for face recognition');
        }

        const docBase64 = files.document[0].buffer.toString('base64');
        const docMediaType = files.document[0].mimetype as any;

        const selfieBase64 = files.selfie[0].buffer.toString('base64');

        const result = await IndividualService.verifyIndividualProfileStandAlone(
            req.params.id as string,
            docBase64,
            selfieBase64,
            docMediaType as SupportedMediaType
        );

        return ok(res, result);
    } catch (err) {
        next(err);
    }
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id || (req.user as any)?.userId;
        if (!id) return fail(res, 'Profile ID is required', 400);

        const data = await IndividualService.getIndividualDashboard(id);
        return ok(res, data);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
