import { analyseDocument, SupportedMediaType } from './documentAnalyser';
import { analyseIdentityDocument } from './identityAnalyser';
import { scoreAnomaly } from './anomalyScorer';
import { scoreIndividualAnomaly } from './individualAnomalyScorer';
import { analyseNetwork } from './networkAnalyser';
import { aggregateScores, aggregateIndividualScores } from './scoreAggregator';
import { IVendorProfile } from '../models/vendorProfile.model';
import { IIndividualProfile } from '../models/individualProfile.model';
import { Verification } from '../models/verification.model';
import { decrypt } from '../utils/crypto';
import moment from 'moment';

export async function runVendorVerification(
    vendor: IVendorProfile,
    documentBase64: string,
    mediaType: SupportedMediaType,
    invoiceAmount?: number
) {
    const [docResult, anomalyResult, networkResult] = await Promise.all([
        analyseDocument(documentBase64, mediaType, {
            companyName: vendor.companyName,
            rcNumber: vendor.rcNumber,
            registrationDate: moment(vendor.registrationDate).format('DD/MM/YYYY'),
        }),
        Promise.resolve(scoreAnomaly(vendor, invoiceAmount)),
        analyseNetwork(String(vendor._id), vendor.bankAccount, vendor.directorBvn, vendor.address),
    ]);

    const aggregated = aggregateScores(docResult, anomalyResult, networkResult);

    const verification = await Verification.create({
        subjectId: vendor._id,
        subjectType: 'vendor',
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

    return { ...aggregated, verificationId: verification._id };
}

export async function runIndividualVerification(
    profile: IIndividualProfile,
    documentBase64: string,
    mediaType: SupportedMediaType,
    transactionAmount?: number
) {
    const plainBvn = decrypt(profile.bvn);

    const [identityResult, anomalyResult, networkResult] = await Promise.all([
        analyseIdentityDocument(documentBase64, mediaType, {
            fullName: profile.fullName,
            dateOfBirth: profile.dateOfBirth.toISOString(),
            bvn: plainBvn,
            ...(profile.ninNumber !== undefined && { ninNumber: profile.ninNumber }),
        }),
        Promise.resolve(scoreIndividualAnomaly(profile, transactionAmount)),
        analyseNetwork(String(profile._id), profile.bankAccount, plainBvn, '', 'individual'),
    ]);

    const aggregated = aggregateIndividualScores(identityResult, anomalyResult, networkResult);

    const verification = await Verification.create({
        subjectId: profile._id,
        subjectType: 'individual',
        trustScore: aggregated.trustScore,
        verdict: aggregated.verdict,
        subScores: aggregated.subScores,
        flags: aggregated.allFlags,
        claudeReasoning: identityResult.reasoning,
        paymentReleased: false,
    });

    return { ...aggregated, verificationId: verification._id };
}