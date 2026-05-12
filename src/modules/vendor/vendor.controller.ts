import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as VendorService from './vendor.service';

const CreateVendorSchema = z.object({
    companyName: z.string().min(2, 'Company name is required'),
    rcNumber: z.string().regex(/^(RC|BN|IT|LLP|LP|CAC\/IT\/NO|IT\/NO\.)\s?\d{5,10}$/i, 'Invalid CAC registration number format'),
    directorBvn: z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
    bankAccount: z.string().regex(/^\d{10}$/, 'Bank account must be exactly 10 digits'),
    bankCode: z.string().min(3, 'Bank code is required'),
    address: z.string().min(5, 'Address is required'),
    registrationDate: z.string().transform((v, ctx) => {
        const dmyMatch = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
        if (dmyMatch) {
            const isoStr = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
            const date = new Date(isoStr);
            if (!isNaN(date.getTime())) return date;
        }
        const ymdMatch = v.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
        if (ymdMatch) {
            const date = new Date(v);
            if (!isNaN(date.getTime())) return date;
        }
        
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date. Use DD/MM/YYYY or YYYY-MM-DD' });
        return z.NEVER;
    }),
    contactEmail: z.string().email('Invalid email address'),
});

const UpdateStatusSchema = z.object({
    status: z.enum(['pending', 'trusted', 'review', 'blocked']),
    reason: z.string().optional(),
});

const VendorFiltersSchema = z.object({
    status: z.enum(['pending', 'trusted', 'review', 'blocked']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
});

function ok(res: Response, data: unknown, status = 200) {
    return res.status(status).json({ success: true, data });
}

function fail(res: Response, message: string, status = 400) {
    return res.status(status).json({ success: false, error: message });
}

export async function createVendor(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = CreateVendorSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const vendor = await VendorService.createVendor(parsed.data);
        return ok(res, vendor, 201);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return fail(res, err.message, 409);
        }
        next(err);
    }
}

export async function getVendor(req: Request, res: Response, next: NextFunction) {
    try {
        const { withVerifications } = req.query;

        const data = withVerifications === 'true'
            ? await VendorService.getVendorWithVerifications(req.params.id as string)
            : await VendorService.getVendorById(req.params.id as string);

        return ok(res, data);
    } catch (err: unknown) {
        if (err instanceof Error && err.message === 'Vendor not found') {
            return fail(res, 'Vendor not found', 404);
        }
        next(err);
    }
}

export async function getAllVendors(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = VendorFiltersSchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await VendorService.getAllVendors(parsed.data);
        return ok(res, result);
    } catch (err) {
        next(err);
    }
}

export async function updateVendorStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = UpdateStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const vendor = await VendorService.updateVendorStatus(
            req.params.id as string,
            parsed.data.status,
            parsed.data.reason,
        );

        return ok(res, vendor);
    } catch (err: unknown) {
        if (err instanceof Error && err.message === 'Vendor not found') {
            return fail(res, 'Vendor not found', 404);
        }
        next(err);
    }
}

export async function deleteVendor(req: Request, res: Response, next: NextFunction) {
    try {
        await VendorService.deleteVendor(req.params.id as string);
        return ok(res, { message: 'Vendor deleted successfully' });
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message === 'Vendor not found') return fail(res, err.message, 404);
            if (err.message.includes('Cannot delete')) return fail(res, err.message, 403);
        }
        next(err);
    }
}
