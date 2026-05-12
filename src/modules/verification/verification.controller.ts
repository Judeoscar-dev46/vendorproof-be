import { Request, Response, NextFunction } from 'express';

import { runVerification } from './verification.service';
import { Verification } from '../../models/verification.model';

declare module 'express' {
    interface Request {
        file?: any;
    }
}

export async function submitVerification(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Document file is required' });
        }

        const { vendorId, invoiceAmount } = req.body;
        const base64 = req.file.buffer.toString('base64');
        const mediaType = req.file.mimetype as 'image/jpeg' | 'image/png' | 'application/pdf';

        const result = await runVerification(vendorId, base64, mediaType, invoiceAmount ? Number(invoiceAmount) : undefined);

        res.status(201).json({
            success: true,
            data: {
                verificationId: result._id,
                trustScore: result.trustScore,
                verdict: result.verdict,
                subScores: result.subScores,
                flags: result.flags,
                reasoning: result.claudeReasoning,
            }
        });
    } catch (err) {
        next(err);
    }
}

export async function getVerification(req: Request, res: Response, next: NextFunction) {
    try {
        const v = await Verification.findById(req.params.id).populate('vendorId', 'companyName rcNumber status');
        if (!v) return res.status(404).json({ error: 'Verification not found' });
        res.json({ success: true, data: v });
    } catch (err) {
        next(err);
    }
}