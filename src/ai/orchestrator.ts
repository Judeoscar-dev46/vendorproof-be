import mongoose from 'mongoose';
import { analyseDocument, SupportedMediaType } from './documentAnalyser';
import { analyseIdentityDocument } from './identityAnalyser';
import { scoreAnomaly } from './anomalyScorer';
import { scoreIndividualAnomaly } from './individualAnomalyScorer';
import { analyseNetwork } from './networkAnalyser';
import { aggregateScores, aggregateIndividualScores } from './scoreAggregator';
import { matchFace } from './faceAnalyser';
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
        subScores: aggregated.subScores as any,
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
    selfieBase64: string,
    mediaType: SupportedMediaType,
    transactionAmount?: number
) {
    if (!profile.bvn || !profile.dateOfBirth || !profile.bankAccount) {
        throw new Error('Incomplete profile: BVN, Date of Birth, and Bank Account are required for verification');
    }

    const plainBvn = decrypt(profile.bvn);

    const [identityResult, anomalyResult, networkResult, faceResult] = await Promise.all([
        analyseIdentityDocument(documentBase64, mediaType, {
            fullName: profile.fullName,
            dateOfBirth: profile.dateOfBirth.toISOString(),
            bvn: plainBvn,
            ...(profile.ninNumber !== undefined && { ninNumber: profile.ninNumber }),
        }),
        Promise.resolve(scoreIndividualAnomaly(profile, transactionAmount)),
        analyseNetwork(String(profile._id), profile.bankAccount, plainBvn, '', 'individual'),
        matchFace(documentBase64, selfieBase64),
    ]);

    const aggregated = aggregateIndividualScores(identityResult, anomalyResult, networkResult, faceResult);

    const verification = await Verification.create({
        subjectId: profile._id,
        subjectType: 'individual',
        trustScore: aggregated.trustScore,
        verdict: aggregated.verdict,
        subScores: aggregated.subScores as any,
        flags: aggregated.allFlags,
        claudeReasoning: identityResult.reasoning,
        paymentReleased: false,
    });

    return { ...aggregated, verificationId: verification._id };
}

export async function runGuestIndividualVerification(
    guestData: {
        fullName: string;
        dateOfBirth: Date;
        bvn: string;
        bankAccount: string;
        bankCode: string;
        phoneNumber: string;
        ninNumber?: string;
    },
    documentBase64: string,
    selfieBase64: string,
    mediaType: SupportedMediaType,
    transactionAmount?: number
) {
    // Create a mock profile with a valid ObjectId for anomaly/network analysis
    const tempId = new mongoose.Types.ObjectId();
    const mockProfile = {
        _id: tempId,
        ...guestData,
    } as any;

    const [identityResult, anomalyResult, networkResult, faceResult] = await Promise.all([
        analyseIdentityDocument(documentBase64, mediaType, {
            fullName: guestData.fullName,
            dateOfBirth: guestData.dateOfBirth.toISOString(),
            bvn: guestData.bvn,
            ...(guestData.ninNumber !== undefined && { ninNumber: guestData.ninNumber }),
        }),
        Promise.resolve(scoreIndividualAnomaly(mockProfile, transactionAmount)),
        analyseNetwork(tempId.toString(), guestData.bankAccount, guestData.bvn, '', 'individual'),
        matchFace(documentBase64, selfieBase64),
    ]);

    const aggregated = aggregateIndividualScores(identityResult, anomalyResult, networkResult, faceResult);

    const verification = await Verification.create({
        subjectId: undefined as any, // guest doesn't have a profile yet
        subjectType: 'individual',
        trustScore: aggregated.trustScore,
        verdict: aggregated.verdict,
        subScores: aggregated.subScores as any,
        flags: aggregated.allFlags,
        claudeReasoning: identityResult.reasoning,
        paymentReleased: false,
    });

    return { ...aggregated, verificationId: verification._id };
}