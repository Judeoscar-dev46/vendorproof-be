import { VendorProfile } from '../models/vendorProfile.model';
import { IndividualProfile } from '../models/individualProfile.model';

export interface NetworkResult {
    score: number;   // 0–100
    flags: string[];
}

export async function analyseNetwork(
    subjectId: string,
    bankAccount: string,
    bvnOrDirBvn: string,
    address: string,
    subjectType: 'vendor' | 'individual' = 'vendor'
): Promise<NetworkResult> {
    if (subjectType === 'individual') {
        return analyseIndividualNetwork(subjectId, bankAccount, bvnOrDirBvn);
    }
    return analyseVendorNetwork(subjectId, bankAccount, bvnOrDirBvn, address);
}

async function analyseVendorNetwork(
    vendorId: string,
    bankAccount: string,
    directorBvn: string,
    address: string
): Promise<NetworkResult> {
    let totalPenalty = 0;
    const flags: string[] = [];

    const applyPenalty = (penalty: number, flag: string) => {
        totalPenalty += penalty;
        flags.push(flag);
    };

    const sharedBankVendors = await VendorProfile.find({
        bankAccount,
        _id: { $ne: vendorId },
    }).select('companyName verificationStatus');

    if (sharedBankVendors.length > 0) {
        const blockedCount = sharedBankVendors.filter(v => v.verificationStatus === 'blocked').length;
        if (blockedCount > 0) {
            applyPenalty(40, `Bank account shared with ${blockedCount} previously blocked vendor(s): ${sharedBankVendors.map(v => v.companyName).join(', ')}`);
        } else {
            applyPenalty(20, `Bank account shared with ${sharedBankVendors.length} other vendor(s)`);
        }
    }

    // NOTE: Shared BVN check won't work with random IV encryption unless we use a hash field.
    // Keeping logic but it will likely find 0 matches for now.
    const sharedBvnVendors = await VendorProfile.find({
        directorBvn,
        _id: { $ne: vendorId },
    });

    if (sharedBvnVendors.length > 1) {
        applyPenalty(30, `Director BVN linked to ${sharedBvnVendors.length + 1} vendor registrations`);
    }

    if (address) {
        const sharedAddressVendors = await VendorProfile.find({
            address: { $regex: address.substring(0, 20), $options: 'i' },
            _id: { $ne: vendorId },
        });

        if (sharedAddressVendors.length >= 3) {
            applyPenalty(20, `Address shared with ${sharedAddressVendors.length} other registered vendors`);
        }
    }

    return { score: Math.max(0, 100 - totalPenalty), flags };
}

async function analyseIndividualNetwork(
    profileId: string,
    bankAccount: string,
    bvn: string
): Promise<NetworkResult> {
    let totalPenalty = 0;
    const flags: string[] = [];

    const applyPenalty = (penalty: number, flag: string) => {
        totalPenalty += penalty;
        flags.push(flag);
    };

    const sharedBankProfiles = await IndividualProfile.find({
        bankAccount,
        _id: { $ne: profileId },
    }).select('fullName verificationStatus');

    if (sharedBankProfiles.length > 0) {
        const blockedCount = sharedBankProfiles.filter(p => p.verificationStatus === 'blocked').length;
        if (blockedCount > 0) {
            applyPenalty(40, `Bank account linked to ${blockedCount} previously blocked individual profile(s)`);
        } else {
            applyPenalty(20, `Bank account shared with ${sharedBankProfiles.length} other individual profile(s)`);
        }
    }

    const sharedBvnProfiles = await IndividualProfile.find({
        bvn,
        _id: { $ne: profileId },
    });

    if (sharedBvnProfiles.length > 0) {
        applyPenalty(35, `BVN linked to ${sharedBvnProfiles.length + 1} individual profiles — possible identity reuse`);
    }

    return { score: Math.max(0, 100 - totalPenalty), flags };
}
