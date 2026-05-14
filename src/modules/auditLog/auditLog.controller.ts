import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as AuditService from './auditLog.service';

const PaginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
});

function ok(res: Response, data: unknown) {
    return res.status(200).json({ success: true, data });
}

function fail(res: Response, message: string, status = 400) {
    return res.status(status).json({ success: false, error: message });
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = PaginationSchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        if (!req.user) {
            return fail(res, 'Not authenticated', 401);
        }

        const { userId, role } = req.user;

        if (['admin', 'officer', 'viewer'].includes(role)) {
            const result = await AuditService.getAllAuditLogs(parsed.data.page, parsed.data.limit);
            return ok(res, result);
        } else {
            console.log(userId)
            const result = await AuditService.getUserAuditLogs(
                userId,
                role,
                parsed.data.page,
                parsed.data.limit
            )
            return ok(res, result);
        }
    } catch (err: unknown) {
        next(err);
    }
}
