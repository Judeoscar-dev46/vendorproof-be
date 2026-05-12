"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitVerification = submitVerification;
exports.getVerification = getVerification;
const verification_service_1 = require("./verification.service");
const verification_model_1 = require("../../models/verification.model");
async function submitVerification(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Document file is required' });
        }
        const { vendorId, invoiceAmount } = req.body;
        const base64 = req.file.buffer.toString('base64');
        const mediaType = req.file.mimetype;
        const result = await (0, verification_service_1.runVerification)(vendorId, base64, mediaType, invoiceAmount ? Number(invoiceAmount) : undefined);
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
    }
    catch (err) {
        next(err);
    }
}
async function getVerification(req, res, next) {
    try {
        const v = await verification_model_1.Verification.findById(req.params.id).populate('vendorId', 'companyName rcNumber status');
        if (!v)
            return res.status(404).json({ error: 'Verification not found' });
        res.json({ success: true, data: v });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=verification.controller.js.map