import { IIndividualProfile } from '../models/individualProfile.model';
import { decrypt } from '../utils/crypto';

export interface IndividualAnomalyResult {
    score: number;
    flags: string[];
    penalties: { rule: string; penalty: number }[];
}

export function scoreIndividualAnomaly(
    profile: IIndividualProfile,
    transactionAmount?: number
): IndividualAnomalyResult {

    let totalPenalty = 0;
    const flags: string[] = [];
    const penalties: { rule: string; penalty: number }[] = [];

    const apply = (rule: string, penalty: number, flag: string) => {
        totalPenalty += penalty;
        flags.push(flag);
        penalties.push({ rule, penalty });
    };

    const plainBvn = decrypt(profile.bvn);
    if (!/^\d{11}$/.test(plainBvn)) {
        apply(
            'invalid_bvn_format',
            30,
            `BVN "${plainBvn}" is not a valid 11-digit number`
        );
    }

    if (profile.ninNumber && !/^\d{11}$/.test(profile.ninNumber)) {
        apply(
            'invalid_nin_format',
            20,
            `NIN "${profile.ninNumber}" is not a valid 11-digit number`
        );
    }

    const ageMs = Date.now() - new Date(profile.dateOfBirth).getTime();
    const ageYrs = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));

    if (ageYrs < 18) {
        apply(
            'underage',
            40,
            `Account holder appears to be under 18 years old (estimated age: ${ageYrs})`
        );
    } else if (ageYrs > 100) {
        apply(
            'implausible_age',
            35,
            `Date of birth suggests age of ${ageYrs} years — likely an entry error or fabricated DOB`
        );
    }

    const phonePattern = /^(\+234|0)(70[0-9]|80[0-9]|81[0-9]|90[0-9]|91[0-9])\d{7}$/;
    if (!phonePattern.test(profile.phoneNumber)) {
        apply(
            'invalid_phone_format',
            20,
            `Phone number "${profile.phoneNumber}" does not match a valid Nigerian format`
        );
    }

    if (!/^\d{10}$/.test(profile.bankAccount)) {
        apply(
            'invalid_account_format',
            25,
            `Bank account "${profile.bankAccount}" is not a valid 10-digit NUBAN`
        );
    }

    if (transactionAmount !== undefined) {
        if (transactionAmount % 1_000_000 === 0 && transactionAmount >= 1_000_000) {
            apply(
                'round_million_amount',
                20,
                `Transaction amount ₦${transactionAmount.toLocaleString()} is a suspiciously round figure`
            );
        }

        else if (transactionAmount % 100_000 === 0 && transactionAmount >= 500_000) {
            apply(
                'round_hundred_k_amount',
                10,
                `Transaction amount ₦${transactionAmount.toLocaleString()} is a round figure`
            );
        }

        if (transactionAmount > 5_000_000) {
            apply(
                'large_p2p_amount',
                15,
                `Transaction amount ₦${transactionAmount.toLocaleString()} is unusually large for a peer-to-peer transfer`
            );
        }
    }

    const nameParts = profile.fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
        apply(
            'incomplete_name',
            15,
            `Full name "${profile.fullName}" appears incomplete — at least a first and last name are expected`
        );
    }

    if (/\d/.test(profile.fullName)) {
        apply(
            'name_contains_digits',
            25,
            `Full name "${profile.fullName}" contains numeric characters — likely a data entry error or fabricated name`
        );
    }

    const score = Math.max(0, 100 - totalPenalty);
    return { score, flags, penalties };
}