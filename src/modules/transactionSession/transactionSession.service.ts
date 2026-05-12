import crypto from 'crypto';
import { TransactionSession, ITransactionSession } from '../../models/transactionSession.model';
import { IndividualProfile } from '../../models/individualProfile.model';
import { runIndividualVerification } from '../../ai/orchestrator';
import { sendSessionInviteNotification } from '../../notifications/notificationService';
import { lookupAccount, fundTransfer } from '../payment/payment.service';
import { getWalletByOwner, debitWallet } from '../wallet/wallet.service';
import { AuditLog } from '../../models/auditLog.model';
import { SupportedMediaType } from '../../ai/documentAnalyser';
import { env } from '../../config/env';

export async function createTransactionSession(
    initiatorProfileId: string,
    dto: {
        recipientPhone?: string;
        recipientEmail?: string;
        amount: number;
        description: string;
    }
) {
    if (!dto.recipientPhone && !dto.recipientEmail) {
        throw new Error('Provide recipient phone or email');
    }

    const sessionCode = `VP-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const session = await TransactionSession.create({
        sessionCode,
        initiatorProfileId,
        amount: dto.amount,
        description: dto.description,
        expiresAt,
        ...(dto.recipientPhone !== undefined && { recipientPhone: dto.recipientPhone }),
        ...(dto.recipientEmail !== undefined && { recipientEmail: dto.recipientEmail }),
    });

    const initiator = await IndividualProfile.findById(initiatorProfileId);

    await sendSessionInviteNotification({
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

export async function joinTransactionSession(
    sessionCode: string,
    recipientProfileId: string
) {
    const session = await TransactionSession.findOne({ sessionCode });
    if (!session) throw new Error('Session not found');
    if (session.status === 'expired') throw new Error('Session has expired');
    if (session.status !== 'awaiting_recipient') {
        throw new Error('Session is no longer accepting participants');
    }

    if (String(session.initiatorProfileId) === recipientProfileId) {
        throw new Error('You cannot join your own payment session');
    }

    await TransactionSession.findByIdAndUpdate(session._id, {
        recipientProfileId,
        status: 'both_verifying',
    });

    return session;
}

export async function submitSessionVerification(
    sessionCode: string,
    profileId: string,
    documentBase64: string,
    mediaType: SupportedMediaType
) {
    const session = await TransactionSession.findOne({ sessionCode });
    if (!session) throw new Error('Session not found');

    if (new Date() > session.expiresAt) {
        await TransactionSession.findByIdAndUpdate(session._id, { status: 'expired' });
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

    const profile = await IndividualProfile
        .findById(profileId)
        .select('+bvn +ninNumber +bankAccount');

    if (!profile) throw new Error('Profile not found');

    const result = await runIndividualVerification(
        profile,
        documentBase64,
        mediaType,
        session.amount
    );

    await IndividualProfile.findByIdAndUpdate(profileId, {
        trustScore: result.trustScore,
        verificationStatus: result.verdict,
        lastVerifiedAt: new Date(),
        internalFlags: result.allFlags,
    });

    const update: Partial<ITransactionSession> = {};

    if (isInitiator) {
        update.initiatorVerificationId = result.verificationId;
        update.initiatorTrustScore = result.trustScore;
        update.initiatorVerdict = result.verdict;
        update.status = session.recipientVerificationId
            ? 'both_verified'
            : 'initiator_verified';
    } else {
        update.recipientVerificationId = result.verificationId;
        update.recipientTrustScore = result.trustScore;
        update.recipientVerdict = result.verdict;
        update.status = session.initiatorVerificationId
            ? 'both_verified'
            : 'recipient_verified';
    }

    await TransactionSession.findByIdAndUpdate(session._id, update);

    const updatedSession = await TransactionSession.findById(session._id);
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

async function evaluateSessionOutcome(session: ITransactionSession) {
    const initiatorBlocked = session.initiatorVerdict === 'blocked';
    const recipientBlocked = session.recipientVerdict === 'blocked';

    if (initiatorBlocked || recipientBlocked) {
        const reason = initiatorBlocked && recipientBlocked
            ? 'Both parties failed verification'
            : initiatorBlocked
                ? 'Payer identity could not be verified'
                : 'Recipient identity could not be verified';

        await TransactionSession.findByIdAndUpdate(session._id, {
            status: 'blocked',
            blockedReason: reason,
        });

        await AuditLog.create({
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

    await TransactionSession.findByIdAndUpdate(session._id, {
        status: 'awaiting_both_consent',
    });
}

export async function giveSessionConsent(
    sessionCode: string,
    profileId: string
) {
    const session = await TransactionSession.findOne({ sessionCode });
    if (!session) throw new Error('Session not found');

    if (!['awaiting_both_consent', 'awaiting_initiator_consent', 'awaiting_recipient_consent']
        .includes(session.status)) {
        throw new Error(`Cannot consent at this stage: ${session.status}`);
    }

    const isInitiator = String(session.initiatorProfileId) === profileId;
    const isRecipient = String(session.recipientProfileId) === profileId;

    if (!isInitiator && !isRecipient) {
        throw new Error('You are not a participant in this session');
    }

    const update: Record<string, unknown> = {};

    if (isInitiator) update.initiatorConsented = true;
    if (isRecipient) update.recipientConsented = true;

    const initiatorNowConsented = isInitiator ? true : session.initiatorConsented;
    const recipientNowConsented = isRecipient ? true : session.recipientConsented;

    if (initiatorNowConsented && recipientNowConsented) {
        update.status = 'payment_released'; // trigger payment
    } else {
        update.status = isInitiator
            ? 'awaiting_recipient_consent'
            : 'awaiting_initiator_consent';
    }

    await TransactionSession.findByIdAndUpdate(session._id, update);

    if (initiatorNowConsented && recipientNowConsented) {
        await releaseSessionPayment(sessionCode);
    }

    return { consented: true, status: update.status };
}

async function releaseSessionPayment(sessionCode: string) {
    const session = await TransactionSession.findOne({ sessionCode })
        .populate('recipientProfileId');

    if (!session) throw new Error('Session not found');

    const recipient = await IndividualProfile
        .findById(session.recipientProfileId)
        .select('+bankAccount');

    if (!recipient) throw new Error('Recipient profile not found');

    const initiator = await IndividualProfile.findById(session.initiatorProfileId);
    if (!initiator) throw new Error('Initiator profile not found');

    const initiatorWallet = await getWalletByOwner(String(session.initiatorProfileId), 'individual');
    if (initiatorWallet.balance < session.amount) {
        throw new Error(
            `Insufficient wallet balance. Available: ₦${initiatorWallet.balance.toLocaleString()}, Required: ₦${session.amount.toLocaleString()}`
        );
    }

    const resolvedAccount = await lookupAccount(recipient.bankCode, recipient.bankAccount);

    const firstName = recipient.fullName.toLowerCase().split(' ')[0] ?? '';
    const nameMatch = resolvedAccount.account_name.toLowerCase().includes(firstName);

    if (!nameMatch) {
        throw new Error(
            `Account name mismatch: profile name "${recipient.fullName}" vs bank name "${resolvedAccount.account_name}"`
        );
    }

    const merchantId = env.SQUAD_MERCHANT_ID;
    const transactionRef = `VP-${merchantId}-${sessionCode}`;

    await fundTransfer({
        transactionReference: transactionRef,
        amount: session.amount,
        bankCode: recipient.bankCode,
        accountNumber: recipient.bankAccount,
        accountName: resolvedAccount.account_name,
        remark: `VendorProof P2P | Session: ${sessionCode} | From: ${initiator.fullName}`,
    });

    await debitWallet(String(session.initiatorProfileId), 'individual', session.amount, transactionRef);

    await TransactionSession.findByIdAndUpdate(session._id, {
        squadTransactionRef: transactionRef,
        paymentReleasedAt: new Date(),
        status: 'payment_released',
    });

    await AuditLog.create({
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

export async function getSessionStatus(sessionCode: string, profileId: string) {
    const session = await TransactionSession.findOne({ sessionCode });
    if (!session) throw new Error('Session not found');

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