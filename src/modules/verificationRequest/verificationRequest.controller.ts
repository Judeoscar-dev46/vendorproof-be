import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as VRService from './verificationRequest.service';
import { SupportedMediaType } from '../../ai/documentAnalyser';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadVerificationFiles = upload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]);
export const uploadDocument = upload.single('document');

const CreateRequestSchema = z.object({
    institutionId: z.string().min(1, 'Institution ID is required'),
    vendorEmail: z.string().email('Invalid vendor email').optional(),
    vendorPhone: z.string().min(7, 'Invalid vendor phone').optional(),
    paymentAmount: z.number().positive('Payment amount must be positive'),
    paymentDescription: z.string().min(1, 'Payment description is required'),
});

const JoinRequestSchema = z.object({
    vendorProfileId: z.string().min(1, 'Vendor profile ID is required'),
});

const DeclineRequestSchema = z.object({
    vendorProfileId: z.string().min(1, 'Vendor profile ID is required'),
    reason: z.string().max(500).optional(),
});

const SubmitVerificationSchema = z.object({
    vendorProfileId: z.string().min(1, 'Vendor profile ID is required'),
    invoiceAmount: z.coerce.number().positive().optional(),
});

const GetStatusSchema = z.object({
    institutionId: z.string().min(1, 'Institution ID is required'),
});

const JoinGuestSchema = z.object({
    fullName: z.string().min(1, 'Full name is required'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
});

const SubmitGuestSchema = z.object({
    guestToken: z.string().min(1, 'Guest token is required'),
    bvn: z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
    bankAccount: z.string().regex(/^\d{10}$/, 'Bank account must be exactly 10 digits'),
    bankCode: z.string().min(1, 'Bank code is required'),
    companyName: z.string().min(1, 'Company name is required'),
    rcNumber: z.string().regex(/^(RC|BN|IT|LLP|LP|CAC\/IT\/NO|IT\/NO\.)\s?\d{5,10}$/i, 'Invalid CAC registration number format'),
    registrationDate: z.string().min(1, 'Registration date is required'),
    address: z.string().min(1, 'Address is required'),
    contactEmail: z.string().email('Invalid email address'),
    invoiceAmount: z.coerce.number().positive().optional(),
});

const ConvertGuestSchema = z.object({
    guestToken: z.string().min(1, 'Guest token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    companyName: z.string().min(1, 'Company name is required'),
    rcNumber: z.string().regex(/^(RC|BN|IT|LLP|LP|CAC\/IT\/NO|IT\/NO\.)\s?\d{5,10}$/i, 'Invalid CAC registration number format'),
    directorBvn: z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
    bankAccount: z.string().regex(/^\d{10}$/, 'Bank account must be exactly 10 digits'),
    bankCode: z.string().min(1, 'Bank code is required'),
    address: z.string().min(1, 'Address is required'),
    registrationDate: z.string().min(1, 'Registration date is required'),
    contactEmail: z.string().email('Invalid email address'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
});

function ok(res: Response, data: unknown, status = 200) {
    return res.status(status).json({ success: true, data });
}

function fail(res: Response, message: string, status = 400) {
    return res.status(status).json({ success: false, error: message });
}

export async function createRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = CreateRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const { institutionId, vendorEmail, vendorPhone, ...required } = parsed.data;

        if (!vendorEmail && !vendorPhone) {
            return fail(res, 'At least one of vendorEmail or vendorPhone is required');
        }

        const dto = {
            ...required,
            ...(vendorEmail !== undefined && { vendorEmail }),
            ...(vendorPhone !== undefined && { vendorPhone }),
        };

        const request = await VRService.createVerificationRequest(institutionId, dto);
        return ok(res, request, 201);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('required')) {
            return fail(res, err.message);
        }
        next(err);
    }
}

export async function joinRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = JoinRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await VRService.joinVerificationRequest(
            req.params.requestCode as string,
            parsed.data.vendorProfileId
        );
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('expired')) return fail(res, err.message, 410);
            if (err.message.includes('already been actioned')) return fail(res, err.message, 409);
        }
        next(err);
    }
}

export async function declineRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = DeclineRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await VRService.declineVerificationRequest(
            req.params.requestCode as string,
            parsed.data.vendorProfileId,
            parsed.data.reason
        );
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}

export async function submitVerification(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            return fail(res, 'Document file is required');
        }

        const parsed = SubmitVerificationSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const base64 = req.file.buffer.toString('base64');
        const mediaType = req.file.mimetype as SupportedMediaType;

        const result = await VRService.submitVendorVerification(
            req.params.requestCode as string,
            parsed.data.vendorProfileId,
            base64,
            mediaType,
            parsed.data.invoiceAmount
        );

        return ok(res, {
            trustScore: result.trustScore,
            verdict: result.verdict,
            subScores: result.subScores,
            verdictSummary: result.verdictSummary,
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('expired')) return fail(res, err.message, 410);
            if (err.message.includes('not in progress')) return fail(res, err.message, 409);
        }
        next(err);
    }
}

export async function getRequestStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = GetStatusSchema.safeParse(req.query);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await VRService.getRequestStatus(
            req.params.requestCode as string,
            parsed.data.institutionId
        );
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}

export async function getDetails(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await VRService.getRequestDetails(req.params.requestCode as string);
        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}

export async function joinRequestGuest(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = JoinGuestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const result = await VRService.joinVerificationRequestAsGuest(
            req.params.requestCode as string,
            parsed.data
        );

        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('expired')) return fail(res, err.message, 410);
            if (err.message.includes('already been actioned')) return fail(res, err.message, 409);
        }
        next(err);
    }
}

export async function submitVerificationGuest(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            return fail(res, 'Document file is required');
        }

        const parsed = SubmitGuestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const docBase64 = req.file.buffer.toString('base64');
        const docMediaType = req.file.mimetype as SupportedMediaType;

        const { guestToken, invoiceAmount, ...guestDetails } = parsed.data;

        const result = await VRService.submitGuestVendorVerification(
            req.params.requestCode as string,
            guestToken,
            guestDetails,
            docBase64,
            docMediaType,
            invoiceAmount
        );

        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('expired')) return fail(res, err.message, 410);
            if (err.message.includes('Invalid or expired')) return fail(res, err.message, 401);
        }
        next(err);
    }
}

export async function convertGuestAccount(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = ConvertGuestSchema.safeParse(req.body);
        if (!parsed.success) {
            return fail(res, parsed.error.issues.map(e => e.message).join(', '));
        }

        const { guestToken, ...accountDetails } = parsed.data;

        const result = await VRService.convertGuestToVendorProfile(
            req.params.requestCode as string,
            guestToken,
            accountDetails
        );

        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('No completed guest verification')) return fail(res, err.message, 404);
            if (err.message.includes('already exists')) return fail(res, err.message, 409);
        }
        next(err);
    }
}

export async function getAllRequests(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user || req.user.role !== 'institution') {
            return fail(res, 'Unauthorized institution access', 403);
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const status = req.query.status as string;
        const search = req.query.search as string;

        const result = await VRService.getAllInstitutionRequests(
            req.user.userId,
            page,
            limit,
            status,
            search
        );

        return ok(res, result);
    } catch (err: unknown) {
        next(err);
    }
}

export async function getRequestDetailsForInstitution(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user || req.user.role !== 'institution') {
            return fail(res, 'Unauthorized institution access', 403);
        }

        const result = await VRService.getInstitutionRequestDetails(
            req.params.requestCode as string,
            req.user.userId
        );

        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
            return fail(res, err.message, 404);
        }
        next(err);
    }
}

export async function approveRequest(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user || req.user.role !== 'institution') {
            return fail(res, 'Unauthorized institution access', 403);
        }

        const result = await VRService.approveVerificationRequest(
            req.params.requestCode as string,
            req.user.userId
        );

        return ok(res, result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('not found')) return fail(res, err.message, 404);
            if (err.message.includes('Only requests in "review"')) return fail(res, err.message, 400);
        }
        next(err);
    }
}
