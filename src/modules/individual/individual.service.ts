import bcrypt from 'bcrypt';
import { encrypt } from '../../utils/crypto';
import { IndividualProfile, IIndividualProfile } from '../../models/individualProfile.model';
import { Verification } from '../../models/verification.model';

export interface CreateIndividualProfileDTO {
    fullName: string;
    bvn: string;
    ninNumber?: string;
    bankAccount: string;
    bankCode: string;
    phoneNumber: string;
    dateOfBirth: string;
    email?: string;
    passwordRaw: string;
}

export async function createIndividualProfile(dto: CreateIndividualProfileDTO): Promise<IIndividualProfile> {
    const existing = await IndividualProfile.findOne({ phoneNumber: dto.phoneNumber });
    if (existing) {
        throw new Error(`An individual profile with phone number ${dto.phoneNumber} already exists`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.passwordRaw, salt);

    const encryptedBvn = encrypt(dto.bvn);

    const profile = await IndividualProfile.create({
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
