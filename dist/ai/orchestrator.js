"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runVendorVerification = runVendorVerification;
exports.runIndividualVerification = runIndividualVerification;
const documentAnalyser_1 = require("./documentAnalyser");
const identityAnalyser_1 = require("./identityAnalyser");
const anomalyScorer_1 = require("./anomalyScorer");
const individualAnomalyScorer_1 = require("./individualAnomalyScorer");
const networkAnalyser_1 = require("./networkAnalyser");
const scoreAggregator_1 = require("./scoreAggregator");
const verification_model_1 = require("../models/verification.model");
const crypto_1 = require("../utils/crypto");
const moment_1 = __importDefault(require("moment"));
async function runVendorVerification(vendor, documentBase64, mediaType, invoiceAmount) {
    const [docResult, anomalyResult, networkResult] = await Promise.all([
        (0, documentAnalyser_1.analyseDocument)(documentBase64, mediaType, {
            companyName: vendor.companyName,
            rcNumber: vendor.rcNumber,
            registrationDate: (0, moment_1.default)(vendor.registrationDate).format('DD/MM/YYYY'),
        }),
        Promise.resolve((0, anomalyScorer_1.scoreAnomaly)(vendor, invoiceAmount)),
        (0, networkAnalyser_1.analyseNetwork)(String(vendor._id), vendor.bankAccount, vendor.directorBvn, vendor.address),
    ]);
    const aggregated = (0, scoreAggregator_1.aggregateScores)(docResult, anomalyResult, networkResult);
    const verification = await verification_model_1.Verification.create({
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
async function runIndividualVerification(profile, documentBase64, mediaType, transactionAmount) {
    const plainBvn = (0, crypto_1.decrypt)(profile.bvn);
    const [identityResult, anomalyResult, networkResult] = await Promise.all([
        (0, identityAnalyser_1.analyseIdentityDocument)(documentBase64, mediaType, {
            fullName: profile.fullName,
            dateOfBirth: profile.dateOfBirth.toISOString(),
            bvn: plainBvn,
            ...(profile.ninNumber !== undefined && { ninNumber: profile.ninNumber }),
        }),
        Promise.resolve((0, individualAnomalyScorer_1.scoreIndividualAnomaly)(profile, transactionAmount)),
        (0, networkAnalyser_1.analyseNetwork)(String(profile._id), profile.bankAccount, plainBvn, '', 'individual'),
    ]);
    const aggregated = (0, scoreAggregator_1.aggregateIndividualScores)(identityResult, anomalyResult, networkResult);
    const verification = await verification_model_1.Verification.create({
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
//# sourceMappingURL=orchestrator.js.map