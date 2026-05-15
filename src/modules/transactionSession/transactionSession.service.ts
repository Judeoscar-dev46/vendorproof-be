import crypto from 'crypto';
import { TransactionSession, ITransactionSession } from '../../models/transactionSession.model';
import { IndividualProfile } from '../../models/individualProfile.model';
import { hasValidVerification } from '../individual/individual.service';
import { runIndividualVerification, runGuestIndividualVerification } from '../../ai/orchestrator';
import { sendSessionInviteNotification } from '../../notifications/notificationService';
import { Verification } from '../../models/verification.model';
import { lookupAccount, fundTransfer } from '../payment/payment.service';
import { getWalletByOwner, debitWallet } from '../wallet/wallet.service';
import { AuditLog } from '../../models/auditLog.model';
import { SupportedMediaType } from '../../ai/documentAnalyser';
import { env } from '../../config/env';
import { encrypt } from '../../utils/crypto';

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

    const wallet = await getWalletByOwner(initiatorProfileId, 'individual');
    if (wallet.balance < dto.amount) {
        throw new Error(`Insufficient wallet balance. Available: ₦${wallet.balance.toLocaleString()}, Required: ₦${dto.amount.toLocaleString()}`);
    }

    const vCheck = await hasValidVerification(initiatorProfileId);

    const session = await TransactionSession.create({
        sessionCode,
        initiatorProfileId,
        amount: dto.amount,
        description: dto.description,
        expiresAt,
        ...(dto.recipientPhone !== undefined && { recipientPhone: dto.recipientPhone }),
        ...(dto.recipientEmail !== undefined && { recipientEmail: dto.recipientEmail }),
        ...(vCheck.valid && {
            initiatorVerificationId: vCheck.verificationId as any,
            initiatorTrustScore: vCheck.trustScore,
            initiatorVerdict: vCheck.verdict,
            status: 'initiator_verified',
        }),
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
    if (session.status !== 'awaiting_recipient' && session.status !== 'initiator_verified') {
        throw new Error('Session is no longer accepting participants');
    }

    if (String(session.initiatorProfileId) === recipientProfileId) {
        throw new Error('You cannot join your own payment session');
    }

    // Check if recipient is already verified
    const vCheck = await hasValidVerification(recipientProfileId);

    const update: Partial<ITransactionSession> = {
        recipientProfileId: recipientProfileId as any,
    };

    if (vCheck.valid && vCheck.trustScore !== undefined && vCheck.verdict !== undefined) {
        update.recipientVerificationId = vCheck.verificationId as any;
        update.recipientTrustScore = vCheck.trustScore;
        update.recipientVerdict = vCheck.verdict;
        update.status = (session.initiatorVerificationId) ? 'both_verified' : 'recipient_verified';
    } else {
        update.status = (session.status === 'initiator_verified') ? 'initiator_verified' : 'both_verifying';
    }

    const updatedSession = await TransactionSession.findByIdAndUpdate(session._id, update, { new: true });
    if (!updatedSession) throw new Error('Failed to update session');

    if (updatedSession.status === 'both_verified') {
        await evaluateSessionOutcome(updatedSession);
    }

    return updatedSession;
}
export async function getSessionDetails(sessionCode: string) {
    const session = await TransactionSession.findOne({ sessionCode }).populate('initiatorProfileId', 'fullName').populate("recipientVerificationId");
    if (!session) throw new Error('Session not found');
    const initiator = session.initiatorProfileId as any;
    const recipient = session.recipientProfileId as any;

    return {
        sessionCode: session.sessionCode,
        amount: session.amount,
        description: session.description,
        initiatorName: initiator?.fullName ?? 'Someone',
        initiatorProfileId: session.initiatorProfileId,
        recipientProfileId: session.recipientProfileId,
        expiresAt: session.expiresAt,
        status: session.status,
        recipientVerificationId: session.recipientVerificationId,
        recipientTrustScore: session.recipientTrustScore,
        recipientVerdict: session.recipientVerdict,
        createdAt: session.createdAt,
    };
}

export async function joinTransactionSessionAsGuest(
    sessionCode: string,
    guestDetails: {
        fullName: string;
        phoneNumber: string;
    }
) {
    const session = await TransactionSession.findOne({ sessionCode });
    if (!session) throw new Error('Session not found');
    if (session.status === 'expired') throw new Error('Session has expired');
    if (session.status !== 'awaiting_recipient' && session.status !== 'initiator_verified') {
        throw new Error('This session is no longer accepting participants');
    }

    const existingProfile = await IndividualProfile.findOne({ phoneNumber: guestDetails.phoneNumber });

    if (existingProfile) {
        return joinTransactionSession(sessionCode, String(existingProfile._id));
    }

    const guestToken = crypto.randomBytes(32).toString('hex');

    await TransactionSession.findByIdAndUpdate(session._id, {
        status: session.status === 'initiator_verified' ? 'initiator_verified' : 'both_verifying',
        'guestDetails.fullName': guestDetails.fullName,
        'guestDetails.phoneNumber': guestDetails.phoneNumber,
        guestToken,
    });

    return {
        isGuest: true,
        guestToken,
        message: 'Joined as guest — proceed to identity verification',
    };
}

export async function submitSessionVerification(
    sessionCode: string,
    profileId: string,
    documentBase64: string,
    selfieBase64: string,
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
        return { message: 'You are already verified for this session', status: session.status };
    }
    if (isRecipient && session.recipientVerificationId) {
        return { message: 'You are already verified for this session', status: session.status };
    }

    const profile = await IndividualProfile
        .findById(profileId)
        .select('+bvn +ninNumber +bankAccount');

    if (!profile) throw new Error('Profile not found');

    const result = await runIndividualVerification(
        profile,
        documentBase64,
        selfieBase64,
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
        update.status = (session.recipientVerificationId || update.recipientVerificationId)
            ? 'both_verified'
            : 'initiator_verified';
    } else {
        update.recipientVerificationId = result.verificationId;
        update.recipientTrustScore = result.trustScore;
        update.recipientVerdict = result.verdict;
        update.status = (session.initiatorVerificationId || update.initiatorVerificationId)
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
                initiatorProfileId: session.initiatorProfileId,
                recipientProfileId: session.recipientProfileId,
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

export async function giveSessionConsentAsGuest(
    sessionCode: string,
    guestToken: string
) {
    const session = await TransactionSession.findOne({ sessionCode, guestToken });
    if (!session) throw new Error('Session not found or invalid guest token');

    if (!['awaiting_both_consent', 'awaiting_recipient_consent']
        .includes(session.status)) {
        throw new Error(`Cannot consent at this stage: ${session.status}`);
    }

    const update: Record<string, unknown> = { recipientConsented: true };

    const initiatorNowConsented = session.initiatorConsented;
    const recipientNowConsented = true;

    if (initiatorNowConsented && recipientNowConsented) {
        update.status = 'payment_released';
    } else {
        update.status = 'awaiting_initiator_consent';
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

    let bankAccount: string;
    let bankCode: string;
    let fullName: string;

    if (session.recipientProfileId) {
        const recipient = await IndividualProfile
            .findById(session.recipientProfileId)
            .select('+bankAccount');
        if (!recipient) throw new Error('Recipient profile not found');
        if (!recipient.bankAccount || !recipient.bankCode) {
            throw new Error('Recipient bank details are incomplete');
        }
        bankAccount = recipient.bankAccount;
        bankCode = recipient.bankCode;
        fullName = recipient.fullName;
    } else if (session.guestDetails && session.guestDetails.bankAccount && session.guestDetails.bankCode) {
        bankAccount = session.guestDetails.bankAccount;
        bankCode = session.guestDetails.bankCode;
        fullName = session.guestDetails.fullName;
    } else {
        throw new Error('Recipient identity details missing');
    }

    const initiator = await IndividualProfile.findById(session.initiatorProfileId);
    if (!initiator) throw new Error('Initiator profile not found');

    const initiatorWallet = await getWalletByOwner(String(session.initiatorProfileId), 'individual');
    if (initiatorWallet.balance < session.amount) {
        throw new Error(
            `Insufficient wallet balance. Available: ₦${initiatorWallet.balance.toLocaleString()}, Required: ₦${session.amount.toLocaleString()}`
        );
    }

    const resolvedAccount = await lookupAccount(bankCode, bankAccount);

    const firstName = fullName.toLowerCase().split(' ')[0] ?? '';
    const nameMatch = resolvedAccount.account_name.toLowerCase().includes(firstName);

    if (!nameMatch) {
        throw new Error(
            `Account name mismatch: provided name "${fullName}" vs bank name "${resolvedAccount.account_name}"`
        );
    }

    const merchantId = env.SQUAD_MERCHANT_ID;
    const transactionRef = `VP-${merchantId}-${sessionCode}`;

    await fundTransfer({
        transactionReference: transactionRef,
        amount: session.amount,
        bankCode: bankCode,
        accountNumber: bankAccount,
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
            initiatorProfileId: session.initiatorProfileId,
            recipientProfileId: session.recipientProfileId,
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

export async function submitSessionVerificationAsGuest(
    sessionCode: string,
    guestToken: string,
    guestData: {
        dateOfBirth: string;
        bvn: string;
        bankAccount: string;
        bankCode: string;
        ninNumber?: string;
    },
    documentBase64: string,
    selfieBase64: string,
    mediaType: SupportedMediaType
) {
    const session = await TransactionSession.findOne({ sessionCode, guestToken });
    if (!session) throw new Error('Session not found or invalid guest token');

    if (new Date() > session.expiresAt) {
        await TransactionSession.findByIdAndUpdate(session._id, { status: 'expired' });
        throw new Error('Session has expired');
    }

    if (session.recipientVerificationId) {
        throw new Error('Verification already submitted for this session');
    }

    const result = await runGuestIndividualVerification(
        {
            ...guestData,
            fullName: session.guestDetails?.fullName || 'Guest',
            phoneNumber: session.guestDetails?.phoneNumber || '',
            dateOfBirth: new Date(guestData.dateOfBirth),
        },
        documentBase64,
        selfieBase64,
        mediaType,
        session.amount
    );

    // Update session with guest results
    await TransactionSession.findByIdAndUpdate(session._id, {
        recipientVerificationId: result.verificationId,
        recipientTrustScore: result.trustScore,
        recipientVerdict: result.verdict,
        status: session.initiatorVerificationId ? 'both_verified' : 'recipient_verified',
        'guestDetails.bvn': encrypt(guestData.bvn),
        'guestDetails.bankAccount': guestData.bankAccount,
        'guestDetails.bankCode': guestData.bankCode,
        'guestDetails.dateOfBirth': new Date(guestData.dateOfBirth),
    });

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