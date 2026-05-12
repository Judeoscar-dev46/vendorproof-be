import { analyseDocument } from '../../ai/documentAnalyser';
import { scoreAnomaly } from '../../ai/anomalyScorer';
import { analyseNetwork } from '../../ai/networkAnalyser';
import { aggregateScores } from '../../ai/scoreAggregator';
import { Vendor } from '../../models/vendor.model';
import { Verification } from '../../models/verification.model';

export async function runVerification(
    vendorId: string,
    documentBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'application/pdf',
    invoiceAmount?: number
) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor not found');

    const [docResult, anomalyResult, networkResult] = await Promise.all([
        analyseDocument(documentBase64, mediaType, {
            companyName: vendor.companyName,
            rcNumber: vendor.rcNumber,
            registrationDate: vendor.registrationDate.toISOString(),
        }),
        Promise.resolve(scoreAnomaly(vendor, invoiceAmount)),
        analyseNetwork(vendorId, vendor.bankAccount, vendor.directorBvn, vendor.address),
    ]);
    console.log(docResult, anomalyResult, networkResult, "Results")

    const aggregated = aggregateScores(docResult, anomalyResult, networkResult);

    const verification = await Verification.create({
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

    await Vendor.findByIdAndUpdate(vendorId, {
        status: aggregated.verdict,
        latestTrustScore: aggregated.trustScore,
    });

    return verification;
}