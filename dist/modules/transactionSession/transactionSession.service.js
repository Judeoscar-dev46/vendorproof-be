"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransactionSession = createTransactionSession;
exports.joinTransactionSession = joinTransactionSession;
exports.submitSessionVerification = submitSessionVerification;
exports.giveSessionConsent = giveSessionConsent;
exports.getSessionStatus = getSessionStatus;
const crypto_1 = __importDefault(require("crypto"));
const transactionSession_model_1 = require("../../models/transactionSession.model");
const individualProfile_model_1 = require("../../models/individualProfile.model");
const orchestrator_1 = require("../../ai/orchestrator");
const notificationService_1 = require("../../notifications/notificationService");
const payment_service_1 = require("../payment/payment.service");
const wallet_service_1 = require("../wallet/wallet.service");
const auditLog_model_1 = require("../../models/auditLog.model");
const env_1 = require("../../config/env");
async function createTransactionSession(initiatorProfileId, dto) {
    if (!dto.recipientPhone && !dto.recipientEmail) {
        throw new Error('Provide recipient phone or email');
    }
    const sessionCode = `VP-${crypto_1.default.randomBytes(2).toString('hex').toUpperCase()}-${crypto_1.default.randomBytes(2).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const session = await transactionSession_model_1.TransactionSession.create({
        sessionCode,
        initiatorProfileId,
        amount: dto.amount,
        description: dto.description,
        expiresAt,
        ...(dto.recipientPhone !== undefined && { recipientPhone: dto.recipientPhone }),
        ...(dto.recipientEmail !== undefined && { recipientEmail: dto.recipientEmail }),
    });
    const initiator = await individualProfile_model_1.IndividualProfile.findById(initiatorProfileId);
    await (0, notificationService_1.sendSessionInviteNotification)({
        sessionCode,
        initiatorName: initiator?.fullName ?? 'Someone',
        amount: dto.amount,
        description: dto.description,
        expiresAt,
        ...(dto.recipientPhone !== undefined && { recipientPhone: dto.recipientPhone }),
        ...(dto.recipientEmail !== undefined && { recipientEmail: dto.recipientEmail }),
    });
    return session;
}
async function joinTransactionSession(sessionCode, recipientProfileId) {
    const session = await transactionSession_model_1.TransactionSession.findOne({ sessionCode });
    if (!session)
        throw new Error('Session not found');
    if (session.status === 'expired')
        throw new Error('Session has expired');
    if (session.status !== 'awaiting_recipient') {
        throw new Error('Session is no longer accepting participants');
    }
    if (String(session.initiatorProfileId) === recipientProfileId) {
        throw new Error('You cannot join your own payment session');
    }
    await transactionSession_model_1.TransactionSession.findByIdAndUpdate(session._id, {
        recipientProfileId,
        status: 'both_verifying',
    });
    return session;
}
async function submitSessionVerification(sessionCode, profileId, documentBase64, mediaType) {
    const session = await transactionSession_model_1.TransactionSession.findOne({ sessionCode });
    if (!session)
        throw new Error('Session not found');
    if (new Date() > session.expiresAt) {
        await transactionSession_model_1.TransactionSession.findByIdAndUpdate(session._id, { status: 'expired' });
        throw new Error('Session has expired');
    }
    const isInitiator = String(session.initiatorProfileId) === profileId;
    const isRecipient = String(session.recipientProfileId) === profileId;
    if (!isInitiator && !isRecipient) {
        throw new Error('You are not a participant in this session');
    }
    if (isInitiator && session.initiatorVerificationId) {
        throw new Error('You have already submitted verification for this session');
    }
    if (isRecipient && session.recipientVerificationId) {
        throw new Error('You have already submitted verification for this session');
    }
    const profile = await individualProfile_model_1.IndividualProfile
        .findById(profileId)
        .select('+bvn +ninNumber +bankAccount');
    if (!profile)
        throw new Error('Profile not found');
    const result = await (0, orchestrator_1.runIndividualVerification)(profile, documentBase64, mediaType, session.amount);
    await individualProfile_model_1.IndividualProfile.findByIdAndUpdate(profileId, {
        trustScore: result.trustScore,
        verificationStatus: result.verdict,
        lastVerifiedAt: new Date(),
        internalFlags: result.allFlags,
    });
    const update = {};
    if (isInitiator) {
        update.initiatorVerificationId = result.verificationId;
        update.initiatorTrustScore = result.trustScore;
        update.initiatorVerdict = result.verdict;
        update.status = session.recipientVerificationId
            ? 'both_verified'
            : 'initiator_verified';
    }
    else {
        update.recipientVerificationId = result.verificationId;
        update.recipientTrustScore = result.trustScore;
        update.recipientVerdict = result.verdict;
        update.status = session.initiatorVerificationId
            ? 'both_verified'
            : 'recipient_verified';
    }
    await transactionSession_model_1.TransactionSession.findByIdAndUpdate(session._id, update);
    const updatedSession = await transactionSession_model_1.TransactionSession.findById(session._id);
    if (updatedSession?.status === 'both_verified') {
        await evaluateSessionOutcome(updatedSession);
    }
    return {
        yourScore: result.trustScore,
        yourVerdict: result.verdict,
        sessionCode,
        status: updatedSession?.status,
    };
}
async function evaluateSessionOutcome(session) {
    const initiatorBlocked = session.initiatorVerdict === 'blocked';
    const recipientBlocked = session.recipientVerdict === 'blocked';
    if (initiatorBlocked || recipientBlocked) {
        const reason = initiatorBlocked && recipientBlocked
            ? 'Both parties failed verification'
            : initiatorBlocked
                ? 'Payer identity could not be verified'
                : 'Recipient identity could not be verified';
        await transactionSession_model_1.TransactionSession.findByIdAndUpdate(session._id, {
            status: 'blocked',
            blockedReason: reason,
        });
        await auditLog_model_1.AuditLog.create({
            action: 'SESSION_BLOCKED',
            metadata: {
                sessionCode: session.sessionCode,
                initiatorScore: session.initiatorTrustScore,
                recipientScore: session.recipientTrustScore,
                initiatorVerdict: session.initiatorVerdict,
                recipientVerdict: session.recipientVerdict,
                reason,
            },
        });
        return;
    }
    await transactionSession_model_1.TransactionSession.findByIdAndUpdate(session._id, {
        status: 'awaiting_both_consent',
    });
}
async function giveSessionConsent(sessionCode, profileId) {
    const session = await transactionSession_model_1.TransactionSession.findOne({ sessionCode });
    if (!session)
        throw new Error('Session not found');
    if (!['awaiting_both_consent', 'awaiting_initiator_consent', 'awaiting_recipient_consent']
        .includes(session.status)) {
        throw new Error(`Cannot consent at this stage: ${session.status}`);
    }
    const isInitiator = String(session.initiatorProfileId) === profileId;
    const isRecipient = String(session.recipientProfileId) === profileId;
    if (!isInitiator && !isRecipient) {
        throw new Error('You are not a participant in this session');
    }
    const update = {};
    if (isInitiator)
        update.initiatorConsented = true;
    if (isRecipient)
        update.recipientConsented = true;
    const initiatorNowConsented = isInitiator ? true : session.initiatorConsented;
    const recipientNowConsented = isRecipient ? true : session.recipientConsented;
    if (initiatorNowConsented && recipientNowConsented) {
        update.status = 'payment_released'; // trigger payment
    }
    else {
        update.status = isInitiator
            ? 'awaiting_recipient_consent'
            : 'awaiting_initiator_consent';
    }
    await transactionSession_model_1.TransactionSession.findByIdAndUpdate(session._id, update);
    if (initiatorNowConsented && recipientNowConsented) {
        await releaseSessionPayment(sessionCode);
    }
    return { consented: true, status: update.status };
}
async function releaseSessionPayment(sessionCode) {
    const session = await transactionSession_model_1.TransactionSession.findOne({ sessionCode })
        .populate('recipientProfileId');
    if (!session)
        throw new Error('Session not found');
    const recipient = await individualProfile_model_1.IndividualProfile
        .findById(session.recipientProfileId)
        .select('+bankAccount');
    if (!recipient)
        throw new Error('Recipient profile not found');
    const initiator = await individualProfile_model_1.IndividualProfile.findById(session.initiatorProfileId);
    if (!initiator)
        throw new Error('Initiator profile not found');
    const initiatorWallet = await (0, wallet_service_1.getWalletByOwner)(String(session.initiatorProfileId), 'individual');
    if (initiatorWallet.balance < session.amount) {
        throw new Error(`Insufficient wallet balance. Available: ₦${initiatorWallet.balance.toLocaleString()}, Required: ₦${session.amount.toLocaleString()}`);
    }
    const resolvedAccount = await (0, payment_service_1.lookupAccount)(recipient.bankCode, recipient.bankAccount);
    const firstName = recipient.fullName.toLowerCase().split(' ')[0] ?? '';
    const nameMatch = resolvedAccount.account_name.toLowerCase().includes(firstName);
    if (!nameMatch) {
        throw new Error(`Account name mismatch: profile name "${recipient.fullName}" vs bank name "${resolvedAccount.account_name}"`);
    }
    const merchantId = env_1.env.SQUAD_MERCHANT_ID;
    const transactionRef = `VP-${merchantId}-${sessionCode}`;
    await (0, payment_service_1.fundTransfer)({
        transactionReference: transactionRef,
        amount: session.amount,
        bankCode: recipient.bankCode,
        accountNumber: recipient.bankAccount,
        accountName: resolvedAccount.account_name,
        remark: `VendorProof P2P | Session: ${sessionCode} | From: ${initiator.fullName}`,
    });
    await (0, wallet_service_1.debitWallet)(String(session.initiatorProfileId), 'individual', session.amount, transactionRef);
    await transactionSession_model_1.TransactionSession.findByIdAndUpdate(session._id, {
        squadTransactionRef: transactionRef,
        paymentReleasedAt: new Date(),
        status: 'payment_released',
    });
    await auditLog_model_1.AuditLog.create({
        action: 'PAYMENT_RELEASED',
        metadata: {
            sessionCode,
            transactionRef,
            amount: session.amount,
            initiatorScore: session.initiatorTrustScore,
            recipientScore: session.recipientTrustScore,
        },
    });
}
async function getSessionStatus(sessionCode, profileId) {
    const session = await transactionSession_model_1.TransactionSession.findOne({ sessionCode });
    if (!session)
        throw new Error('Session not found');
    const isInitiator = String(session.initiatorProfileId) === profileId;
    const isRecipient = String(session.recipientProfileId) === profileId;
    if (!isInitiator && !isRecipient) {
        throw new Error('You are not a participant in this session');
    }
    const scoresVisible = [
        'both_verified', 'awaiting_both_consent',
        'awaiting_initiator_consent', 'awaiting_recipient_consent',
        'payment_released', 'blocked',
    ].includes(session.status);
    return {
        sessionCode: session.sessionCode,
        amount: session.amount,
        description: session.description,
        status: session.status,
        blockedReason: session.status === 'blocked' ? session.blockedReason : undefined,
        expiresAt: session.expiresAt,
        initiatorScore: scoresVisible ? session.initiatorTrustScore : undefined,
        recipientScore: scoresVisible ? session.recipientTrustScore : undefined,
        initiatorVerdict: scoresVisible ? session.initiatorVerdict : undefined,
        recipientVerdict: scoresVisible ? session.recipientVerdict : undefined,
        yourConsent: isInitiator ? session.initiatorConsented : session.recipientConsented,
        theirConsent: isInitiator ? session.recipientConsented : session.initiatorConsented,
        squadTransactionRef: session.status === 'payment_released'
            ? session.squadTransactionRef
            : undefined,
    };
}
//# sourceMappingURL=transactionSession.service.js.map