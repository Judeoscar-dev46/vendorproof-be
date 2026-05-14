"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndividualProfile = createIndividualProfile;
exports.getIndividualProfile = getIndividualProfile;
exports.updateIndividualProfile = updateIndividualProfile;
exports.verifyIndividualProfileStandAlone = verifyIndividualProfileStandAlone;
exports.hasValidVerification = hasValidVerification;
exports.getIndividualVerificationHistory = getIndividualVerificationHistory;
exports.getIndividualDashboard = getIndividualDashboard;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = require("../../utils/crypto");
const individualProfile_model_1 = require("../../models/individualProfile.model");
const verification_model_1 = require("../../models/verification.model");
const orchestrator_1 = require("../../ai/orchestrator");
const wallet_model_1 = require("../../models/wallet.model");
const transactionSession_model_1 = require("../../models/transactionSession.model");
async function createIndividualProfile(dto) {
    const existing = await individualProfile_model_1.IndividualProfile.findOne({ phoneNumber: dto.phoneNumber });
    if (existing) {
        throw new Error(`An individual profile with phone number ${dto.phoneNumber} already exists`);
    }
    const salt = await bcrypt_1.default.genSalt(10);
    const passwordHash = await bcrypt_1.default.hash(dto.passwordRaw, salt);
    const encryptedBvn = (0, crypto_1.encrypt)(dto.bvn);
    const profile = await individualProfile_model_1.IndividualProfile.create({
        fullName: dto.fullName,
        bvn: encryptedBvn,
        bankAccount: dto.bankAccount,
        bankCode: dto.bankCode,
        phoneNumber: dto.phoneNumber,
        dateOfBirth: new Date(dto.dateOfBirth),
        ...(dto.ninNumber !== undefined && { ninNumber: dto.ninNumber }),
        ...(dto.email !== undefined && { email: dto.email }),
        passwordHash,
    });
    const profileObj = profile.toObject();
    delete profileObj.passwordHash;
    delete profileObj.bvn;
    return profileObj;
}
async function getIndividualProfile(id) {
    const profile = await individualProfile_model_1.IndividualProfile.findById(id);
    if (!profile)
        throw new Error('Individual profile not found');
    return profile;
}
async function updateIndividualProfile(id, dto) {
    const profile = await individualProfile_model_1.IndividualProfile.findById(id);
    if (!profile)
        throw new Error('Individual profile not found');
    if (dto.fullName)
        profile.fullName = dto.fullName;
    if (dto.ninNumber !== undefined)
        profile.ninNumber = dto.ninNumber;
    if (dto.bankCode)
        profile.bankCode = dto.bankCode;
    if (dto.phoneNumber)
        profile.phoneNumber = dto.phoneNumber;
    if (dto.email !== undefined)
        profile.email = dto.email;
    if (dto.dateOfBirth)
        profile.dateOfBirth = new Date(dto.dateOfBirth);
    await profile.save();
    return profile;
}
async function verifyIndividualProfileStandAlone(id, documentBase64, selfieBase64, mediaType) {
    const profile = await individualProfile_model_1.IndividualProfile.findById(id).select('+bvn +ninNumber +bankAccount');
    if (!profile)
        throw new Error('Individual profile not found');
    if (profile.lastVerifiedAt) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (profile.lastVerifiedAt > oneDayAgo) {
            throw new Error('You can only perform identity verification once every 24 hours');
        }
    }
    const result = await (0, orchestrator_1.runIndividualVerification)(profile, documentBase64, selfieBase64, mediaType);
    await individualProfile_model_1.IndividualProfile.findByIdAndUpdate(id, {
        trustScore: result.trustScore,
        verificationStatus: result.verdict,
        lastVerifiedAt: new Date(),
        internalFlags: result.allFlags,
    });
    return result;
}
async function hasValidVerification(id) {
    const profile = await individualProfile_model_1.IndividualProfile.findById(id);
    if (!profile || profile.verificationStatus !== 'trusted' || !profile.lastVerifiedAt) {
        return { valid: false };
    }
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    if (profile.lastVerifiedAt < ninetyDaysAgo) {
        return { valid: false };
    }
    const latestVerification = await verification_model_1.Verification.findOne({
        subjectId: id,
        subjectType: 'individual',
        verdict: 'trusted',
    }).sort({ createdAt: -1 });
    return {
        valid: true,
        trustScore: profile.trustScore ?? 0,
        verdict: profile.verificationStatus,
        verificationId: latestVerification ? String(latestVerification._id) : undefined,
    };
}
async function getIndividualVerificationHistory(id) {
    const profile = await individualProfile_model_1.IndividualProfile.findById(id);
    if (!profile)
        throw new Error('Individual profile not found');
    const verifications = await verification_model_1.Verification.find({
        subjectId: id,
        subjectType: 'individual',
    })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('trustScore verdict flags subScores createdAt');
    return { profile, verifications };
}
async function getIndividualDashboard(id) {
    const profile = await individualProfile_model_1.IndividualProfile.findById(id);
    if (!profile)
        throw new Error('Individual profile not found');
    const [wallet, verificationsCount, recentVerifications, recentSessions] = await Promise.all([
        wallet_model_1.Wallet.findOne({ ownerId: id, ownerType: 'individual' }),
        verification_model_1.Verification.countDocuments({ subjectId: id, subjectType: 'individual' }),
        verification_model_1.Verification.find({ subjectId: id, subjectType: 'individual' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('trustScore verdict createdAt'),
        transactionSession_model_1.TransactionSession.find({
            $or: [
                { initiatorProfileId: id },
                { recipientProfileId: id }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('initiatorProfileId', 'fullName')
            .populate('recipientProfileId', 'fullName')
    ]);
    return {
        profile: {
            fullName: profile.fullName,
            verificationStatus: profile.verificationStatus,
            trustScore: profile.trustScore,
            lastVerifiedAt: profile.lastVerifiedAt,
        },
        stats: {
            walletBalance: wallet?.balance || 0,
            verificationsCount,
            totalP2PVolume: recentSessions.reduce((acc, s) => acc + (s.status === 'payment_released' ? s.amount : 0), 0),
        },
        wallet: wallet ? {
            accountNumber: wallet.accountNumber,
            bankCode: wallet.bankCode,
            status: wallet.status,
        } : null,
        recentVerifications,
        recentSessions: recentSessions.map(s => ({
            sessionCode: s.sessionCode,
            amount: s.amount,
            description: s.description,
            status: s.status,
            role: String(s.initiatorProfileId?._id) === id ? 'initiator' : 'recipient',
            otherParty: String(s.initiatorProfileId?._id) === id
                ? s.recipientProfileId?.fullName || s.guestDetails?.fullName || 'Guest'
                : s.initiatorProfileId?.fullName,
            createdAt: s.createdAt,
        })),
    };
}
//# sourceMappingURL=individual.service.js.map