import axios from 'axios';
import moment from 'moment';
import crypto from 'crypto';

import { Wallet, IWallet } from '../../models/wallet.model';
import { AuditLog } from '../../models/auditLog.model';
import { IndividualProfile } from '../../models/individualProfile.model';
import { InstitutionProfile } from '../../models/institutionProfile.model';
import { decrypt, encrypt } from '../../utils/crypto';
import { env } from '../../config/env';

interface WalletData {
    ownerId: string;
    ownerType: 'individual' | 'institution';
    bvn: string;
    address: string;
    gender: string;
    email?: string | undefined;
    accountNumber?: string | undefined;
    phoneNumber?: string | undefined;
    dateOfBirth?: string | undefined;
    ninNumber?: string | undefined;
    bankAccount?: string | undefined;
    bankCode?: string | undefined;
}

function formatDOB(dob: string) {
    return moment(dob, 'DD/MM/YYYY').format('MM/DD/YYYY');
}

function createCustomerId(ownerId: string) {
    return `VP-${ownerId}`;
}

export async function createWallet(walletData: WalletData): Promise<IWallet> {
    const existing = await Wallet.findOne({
        ownerId: walletData.ownerId,
        ownerType: walletData.ownerType,
    });
    if (existing) {
        throw new Error('A wallet already exists for this profile');
    }

    const customerId = createCustomerId(walletData.ownerId);
    let responseData: Record<string, unknown>;
    let email = walletData.email || '';
    let mobileNumber = '';
    let firstName = '';
    let lastName = '';
    let bvn = walletData.bvn || '';
    let businessName: string | undefined;

    if (walletData.ownerType === 'individual') {
        const profile = await IndividualProfile.findById(walletData.ownerId);
        if (!profile) throw new Error('Individual profile not found');

        const update: Record<string, any> = {};
        if (walletData.bvn) update.bvn = encrypt(walletData.bvn);
        if (walletData.phoneNumber) update.phoneNumber = walletData.phoneNumber;
        if (walletData.dateOfBirth) update.dateOfBirth = moment(walletData.dateOfBirth, 'DD/MM/YYYY').toDate();
        if (walletData.ninNumber) update.ninNumber = walletData.ninNumber;
        if (walletData.bankAccount) update.bankAccount = walletData.accountNumber;
        if (walletData.bankCode) update.bankCode = walletData.bankCode;

        if (Object.keys(update).length > 0) {
            await IndividualProfile.findByIdAndUpdate(walletData.ownerId, update);
        }

        const updatedProfile = await IndividualProfile.findById(walletData.ownerId).select('+bvn');
        if (!updatedProfile) throw new Error('Failed to retrieve updated profile');

        const parts = updatedProfile.fullName.trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || parts[0] || '';
        email = updatedProfile.email || walletData.email || '';
        bvn = walletData.bvn || (updatedProfile.bvn ? decrypt(updatedProfile.bvn) : '');
        mobileNumber = updatedProfile.phoneNumber || walletData.phoneNumber || '';

        if (!bvn) throw new Error('BVN is required for wallet creation');
        if (!mobileNumber) throw new Error('Phone number is required for wallet creation');

        const dob = moment(updatedProfile.dateOfBirth).format('DD/MM/YYYY');

        if (!email) throw new Error('Email is required to create a wallet');

        const payload: Record<string, unknown> = {
            customer_identifier: customerId,
            first_name: firstName,
            last_name: lastName,
            mobile_num: mobileNumber,
            email,
            bvn,
            dob: formatDOB(dob),
            address: walletData.address,
            gender: walletData.gender === 'male' ? '1' : '2',
        };
        if (walletData.accountNumber) payload['beneficiary_account'] = walletData.accountNumber;

        const res = await axios.post(`${env.SQUAD_BASE_URL}/virtual-account`, payload, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.SQUAD_SECRET_KEY}` },
        });
        if (res.status !== 200) throw new Error('Unable to create Squad individual virtual account');
        responseData = res.data.data;
    } else {
        const profile = await InstitutionProfile.findById(walletData.ownerId);
        if (!profile) throw new Error('Institution profile not found');

        if (!walletData.bvn) throw new Error('Director BVN is required for institution wallet creation');

        businessName = profile.businessName;
        email = profile.email;
        mobileNumber = profile.phoneNumber;
        firstName = profile.firstName;
        lastName = profile.lastName;

        const payload: Record<string, unknown> = {
            customer_identifier: customerId,
            business_name: businessName,
            mobile_num: mobileNumber,
            bvn: walletData.bvn,
        };
        if (walletData.accountNumber) payload['beneficiary_account'] = walletData.accountNumber;

        const res = await axios.post(`${env.SQUAD_BASE_URL}/virtual-account/business`, payload, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.SQUAD_SECRET_KEY}` },
        });
        if (res.status !== 200) throw new Error('Unable to create Squad business virtual account');
        responseData = res.data.data;
    }

    const wallet = await Wallet.create({
        ownerId: walletData.ownerId,
        ownerType: walletData.ownerType,
        firstName: responseData["first_name"] as string,
        lastName: responseData["last_name"] as string,
        email,
        bvn: encrypt(bvn),
        address: walletData.address,
        gender: walletData.gender,
        bankCode: responseData['bank_code'] as string,
        accountNumber: responseData['virtual_account_number'] as string,
        mobileNumber,
        settlementAccountNumber: (responseData['beneficiary_account'] as string) ?? '',
        customerId: responseData['customer_identifier'] as string,
        balance: 0,
        status: 'active',
        recentFundings: [],
    });

    return wallet;
}

export async function getWalletById(id: string): Promise<IWallet> {
    const wallet = await Wallet.findById(id);
    if (!wallet) throw new Error('Wallet not found');
    return wallet;
}

export async function getWalletByOwner(
    ownerId: string,
    ownerType: 'individual' | 'institution'
): Promise<IWallet> {
    const wallet = await Wallet.findOne({ ownerId, ownerType });
    if (!wallet) throw new Error('Wallet not found for this profile');
    return wallet;
}

export async function creditWalletByVirtualAccount(
    virtualAccountNumber: string,
    settledAmountKobo: number,
    transactionReference: string,
    metadata: Record<string, unknown>
): Promise<void> {
    const wallet = await Wallet.findOneAndUpdate(
        { accountNumber: virtualAccountNumber },
        {
            $inc: { balance: settledAmountKobo },
            $push: {
                recentFundings: {
                    $each: [{
                        amount: settledAmountKobo,
                        fundedAt: new Date(),
                        reference: transactionReference
                    }],
                    $slice: -10
                }
            }
        },
        { returnDocument: 'after' }
    );

    if (!wallet) {
        console.warn(`[Wallet] Credit webhook for unknown virtual account: ${virtualAccountNumber}`);
        return;
    }

    await AuditLog.create({
        action: 'WALLET_CREDITED',
        metadata: {
            ownerId: String(wallet.ownerId),
            ownerType: wallet.ownerType,
            virtualAccountNumber,
            settledAmountNaira: settledAmountKobo,
            transactionReference,
            ...metadata,
        },
    });
}

export async function debitWallet(
    ownerId: string,
    ownerType: 'individual' | 'institution',
    amountNaira: number,
    transactionReference: string
): Promise<void> {
    const wallet = await Wallet.findOne({ ownerId, ownerType });
    if (!wallet) throw new Error('Wallet not found for this profile');

    if (wallet.balance < amountNaira) {
        throw new Error(
            `Insufficient wallet balance. Available: ₦${wallet.balance.toLocaleString()}, Required: ₦${amountNaira.toLocaleString()}`
        );
    }

    await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: -amountNaira } });

    await AuditLog.create({
        action: 'WALLET_DEBITED',
        metadata: {
            ownerId,
            ownerType,
            amountNaira,
            transactionReference,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance - amountNaira,
        },
    });
}

export async function simulateFunding(accountNumber: string, amount: number) {
    const payload = {
        virtual_account_number: accountNumber,
        amount: amount.toString(),
    };

    const res = await axios.post(`${env.SQUAD_BASE_URL}/virtual-account/simulate/payment`, payload, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.SQUAD_SECRET_KEY}`
        },
    });

    return res.data;
}
