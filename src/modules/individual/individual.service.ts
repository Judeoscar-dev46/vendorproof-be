import bcrypt from 'bcrypt';
import { encrypt } from '../../utils/crypto';
import { IndividualProfile, IIndividualProfile } from '../../models/individualProfile.model';
import { Verification } from '../../models/verification.model';
import { runIndividualVerification } from '../../ai/orchestrator';
import { SupportedMediaType } from '../../ai/documentAnalyser';
import { Wallet } from '../../models/wallet.model';
import { TransactionSession } from '../../models/transactionSession.model';

export interface CreateIndividualProfileDTO {
    fullName: string;
    bvn?: string | undefined;
    ninNumber?: string | undefined;
    bankAccount?: string | undefined;
    bankCode?: string | undefined;
    phoneNumber?: string | undefined;
    dateOfBirth?: string | undefined;
    email?: string | undefined;
    passwordRaw: string;
}

export async function createIndividualProfile(dto: CreateIndividualProfileDTO): Promise<IIndividualProfile> {
    if (dto.phoneNumber) {
        const existing = await IndividualProfile.findOne({ phoneNumber: dto.phoneNumber });
        if (existing) {
            throw new Error(`An individual profile with phone number ${dto.phoneNumber} already exists`);
        }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.passwordRaw, salt);

    const profile = await IndividualProfile.create({
        fullName: dto.fullName,
        passwordHash,
        ...(dto.bvn !== undefined && { bvn: encrypt(dto.bvn) }),
        ...(dto.bankAccount !== undefined && { bankAccount: dto.bankAccount }),
        ...(dto.bankCode !== undefined && { bankCode: dto.bankCode }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.dateOfBirth !== undefined && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.ninNumber !== undefined && { ninNumber: dto.ninNumber }),
        ...(dto.email !== undefined && { email: dto.email }),
    });

    const profileObj = profile.toObject();
    delete (profileObj as any).passwordHash;
    delete (profileObj as any).bvn;
    return profileObj as IIndividualProfile;
}

export async function getIndividualProfile(id: string): Promise<IIndividualProfile> {
    const profile = await IndividualProfile.findById(id);
    if (!profile) throw new Error('Individual profile not found');
    return profile;
}

export async function updateIndividualProfile(
    id: string,
    dto: Partial<Omit<CreateIndividualProfileDTO, 'bvn' | 'bankAccount'>>
): Promise<IIndividualProfile> {
    const profile = await IndividualProfile.findById(id);
    if (!profile) throw new Error('Individual profile not found');

    if (dto.fullName) profile.fullName = dto.fullName;
    if (dto.ninNumber !== undefined) profile.ninNumber = dto.ninNumber;
    if (dto.bankCode) profile.bankCode = dto.bankCode;
    if (dto.phoneNumber) profile.phoneNumber = dto.phoneNumber;
    if (dto.email !== undefined) profile.email = dto.email;
    if (dto.dateOfBirth) profile.dateOfBirth = new Date(dto.dateOfBirth);

    await profile.save();
    return profile;
}

export async function verifyIndividualProfileStandAlone(
    id: string,
    documentBase64: string,
    selfieBase64: string,
    mediaType: SupportedMediaType
) {
    const profile = await IndividualProfile.findById(id).select('+bvn +ninNumber +bankAccount');
    if (!profile) throw new Error('Individual profile not found');

    if (profile.lastVerifiedAt) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (profile.lastVerifiedAt > oneDayAgo) {
            throw new Error('You can only perform identity verification once every 24 hours');
        }
    }

    const result = await runIndividualVerification(profile, documentBase64, selfieBase64, mediaType);

    await IndividualProfile.findByIdAndUpdate(id, {
        trustScore: result.trustScore,
        verificationStatus: result.verdict,
        lastVerifiedAt: new Date(),
        internalFlags: result.allFlags,
    });

    return result;
}

export async function hasValidVerification(id: string): Promise<{ valid: boolean; trustScore?: number; verdict?: 'trusted' | 'review' | 'blocked'; verificationId?: string | undefined }> {
    const profile = await IndividualProfile.findById(id);
    if (!profile || profile.verificationStatus !== 'trusted' || !profile.lastVerifiedAt) {
        return { valid: false };
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    if (profile.lastVerifiedAt < ninetyDaysAgo) {
        return { valid: false };
    }

    const latestVerification = await Verification.findOne({
        subjectId: id,
        subjectType: 'individual',
        verdict: 'trusted',
    }).sort({ createdAt: -1 });

    return {
        valid: true,
        trustScore: profile.trustScore ?? 0,
        verdict: profile.verificationStatus as 'trusted' | 'review' | 'blocked',
        verificationId: latestVerification ? String(latestVerification._id) : undefined,
    };
}

export async function getIndividualVerificationHistory(id: string) {
    const profile = await IndividualProfile.findById(id);
    if (!profile) throw new Error('Individual profile not found');

    const verifications = await Verification.find({
        subjectId: id,
        subjectType: 'individual',
    })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('trustScore verdict flags subScores createdAt');

    return { profile, verifications };
}

export async function getIndividualDashboard(id: string) {
    const profile = await IndividualProfile.findById(id);
    if (!profile) throw new Error('Individual profile not found');

    const [wallet, verificationsCount, recentVerifications, recentSessions] = await Promise.all([
        Wallet.findOne({ ownerId: id, ownerType: 'individual' }),
        Verification.countDocuments({ subjectId: id, subjectType: 'individual' }),
        Verification.find({ subjectId: id, subjectType: 'individual' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('trustScore verdict createdAt'),
        TransactionSession.find({
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
                ? (s.recipientProfileId as any)?.fullName || s.guestDetails?.fullName || 'Guest'
                : (s.initiatorProfileId as any)?.fullName,
            createdAt: s.createdAt,
        })),
    };
}
