"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runVerification = runVerification;
const documentAnalyser_1 = require("../../ai/documentAnalyser");
const anomalyScorer_1 = require("../../ai/anomalyScorer");
const networkAnalyser_1 = require("../../ai/networkAnalyser");
const scoreAggregator_1 = require("../../ai/scoreAggregator");
const vendor_model_1 = require("../../models/vendor.model");
const verification_model_1 = require("../../models/verification.model");
async function runVerification(vendorId, documentBase64, mediaType, invoiceAmount) {
    const vendor = await vendor_model_1.Vendor.findById(vendorId);
    if (!vendor)
        throw new Error('Vendor not found');
    const [docResult, anomalyResult, networkResult] = await Promise.all([
        (0, documentAnalyser_1.analyseDocument)(documentBase64, mediaType, {
            companyName: vendor.companyName,
            rcNumber: vendor.rcNumber,
            registrationDate: vendor.registrationDate.toISOString(),
        }),
        Promise.resolve((0, anomalyScorer_1.scoreAnomaly)(vendor, invoiceAmount)),
        (0, networkAnalyser_1.analyseNetwork)(vendorId, vendor.bankAccount, vendor.directorBvn, vendor.address),
    ]);
    console.log(docResult, anomalyResult, networkResult, "Results");
    const aggregated = (0, scoreAggregator_1.aggregateScores)(docResult, anomalyResult, networkResult);
    const verification = await verification_model_1.Verification.create({
        vendorId: vendor._id,
        trustScore: aggregated.trustScore,
        verdict: aggregated.verdict,
        subScores: aggregated.subScores,
        flags: aggregated.allFlags,
        claudeReasoning: docResult.reasoning,
        documentMetadata: {
            extractedName: docResult.extractedName,
            extractedRcNumber: docResult.extractedRcNumber,
            nameMatch: docResult.nameMatch,
            rcMatch: docResult.rcMatch,
            documentType: docResult.documentType,
        },
        paymentReleased: false,
    });
    await vendor_model_1.Vendor.findByIdAndUpdate(vendorId, {
        status: aggregated.verdict,
        latestTrustScore: aggregated.trustScore,
    });
    return verification;
}
//# sourceMappingURL=verification.service.js.map