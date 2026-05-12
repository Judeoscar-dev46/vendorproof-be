import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as InstitutionService from './institution.service';

const CreateProfileSchema = z.object({
    businessName: z.string().min(2, 'Business name is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    rcNumber: z.string().regex(/^(RC|BN|IT|LLP|LP|CAC\/IT\/NO|IT\/NO\.)\s?\d{5,10}$/i, 'Invalid CAC registration number format'),
    email: z.string().email('Invalid email address'),
    phoneNumber: z.string().min(7, 'Phone number is required'),
    address: z.string().min(5, 'Address is required'),
    unverifiedVendorPolicy: z.enum(['block', 'review', 'allow', 'escalate']).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const UpdateProfileSchema = CreateProfileSchema.omit({ rcNumber: true, password: true }).partial();

const PaginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
});

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

        const { unverifiedVendorPolicy, password, ...required } = parsed.data;
        const profile = await InstitutionService.createInstitutionProfile({
            ...required,
            passwordRaw: password,
            ...(unverifiedVendorPolicy !== undefined && { unverifiedVendorPolicy }),
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
        const profile = await InstitutionService.getInstitutionProfile(req.params.id as string);
        return ok(res, profile);
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
        ) as Parameters<typeof InstitutionService.updateInstitutionProfile>[1];
        const profile = await InstitutionService.updateInstitutionProfile(
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

export async function getVerificationRequests(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = PaginationSchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await InstitutionService.getInstitutionVerificationRequests(
            req.params.id as string,
            parsed.data.page,
            parsed.data.limit
        );
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user || req.user.role !== 'institution') {
            return fail(res, 'Unauthorized institution access', 403);
        }

        const result = await InstitutionService.getInstitutionDashboard(req.user.userId);
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}
