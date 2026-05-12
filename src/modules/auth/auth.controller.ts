import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as AuthService from './auth.service';
import { env } from '../../config/env';

const RegisterSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['admin', 'officer', 'viewer']),
    setupToken: z.string().optional(),
});

const LoginSchema = z.object({
    identifier: z.string().min(1, 'Email or phone number is required').optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(1, 'Password is required'),
    userType: z.enum(['admin', 'individual', 'institution', 'vendor']).default('admin'),
}).refine(data => data.identifier || data.email, {
    message: 'Either identifier or email is required',
    path: ['identifier'],
});

function ok(res: Response, data: unknown, status = 200) {
    return res.status(status).json({ success: true, data });
}

function fail(res: Response, message: string, status = 400) {
    return res.status(status).json({ success: false, error: message });
}

export async function registerAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = RegisterSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const { setupToken, ...dto } = parsed.data;

        if (setupToken) {
            if (setupToken !== env.ADMIN_SETUP_TOKEN) {
                return fail(res, 'Invalid setup token', 403);
            }
        } else {
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
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return fail(res, err.message, 409);
        }
        next(err);
    }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = LoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await AuthService.login({
            identifier: parsed.data.identifier || parsed.data.email!,
            passwordRaw: parsed.data.password,
            userType: parsed.data.userType,
        });

        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message === 'Invalid email or password') {
            return fail(res, err.message, 401);
        }
        next(err);
    }
}
