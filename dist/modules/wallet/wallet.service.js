"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWallet = createWallet;
exports.getWalletById = getWalletById;
exports.getWalletByOwner = getWalletByOwner;
exports.creditWalletByVirtualAccount = creditWalletByVirtualAccount;
exports.debitWallet = debitWallet;
const axios_1 = __importDefault(require("axios"));
const moment_1 = __importDefault(require("moment"));
const wallet_model_1 = require("../../models/wallet.model");
const auditLog_model_1 = require("../../models/auditLog.model");
const individualProfile_model_1 = require("../../models/individualProfile.model");
const institutionProfile_model_1 = require("../../models/institutionProfile.model");
const crypto_1 = require("../../utils/crypto");
const env_1 = require("../../config/env");
function formatDOB(dob) {
    return (0, moment_1.default)(dob, 'DD/MM/YYYY').format('MM/DD/YYYY');
}
function createCustomerId(ownerId) {
    return `VP-${ownerId}`;
}
async function createWallet(walletData) {
    const existing = await wallet_model_1.Wallet.findOne({
        ownerId: walletData.ownerId,
        ownerType: walletData.ownerType,
    });
    if (existing) {
        throw new Error('A wallet already exists for this profile');
    }
    const customerId = createCustomerId(walletData.ownerId);
    let responseData;
    let email = walletData.email || '';
    let mobileNumber = '';
    let firstName = '';
    let lastName = '';
    let bvn = walletData.bvn || '';
    let businessName;
    if (walletData.ownerType === 'individual') {
        const profile = await individualProfile_model_1.IndividualProfile.findById(walletData.ownerId).select('+bvn');
        if (!profile)
            throw new Error('Individual profile not found');
        const parts = profile.fullName.trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || parts[0] || '';
        email = profile.email || walletData.email || '';
        bvn = (0, crypto_1.decrypt)(profile.bvn);
        mobileNumber = profile.phoneNumber;
        const dob = (0, moment_1.default)(profile.dateOfBirth).format('DD/MM/YYYY');
        if (!email)
            throw new Error('Email is required to create a wallet');
        const payload = {
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
        if (walletData.accountNumber)
            payload['beneficiary_account'] = walletData.accountNumber;
        const res = await axios_1.default.post(`${env_1.env.SQUAD_BASE_URL}/virtual-account`, payload, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env_1.env.SQUAD_SECRET_KEY}` },
        });
        if (res.status !== 200)
            throw new Error('Unable to create Squad individual virtual account');
        responseData = res.data.data;
    }
    else {
        const profile = await institutionProfile_model_1.InstitutionProfile.findById(walletData.ownerId);
        if (!profile)
            throw new Error('Institution profile not found');
        if (!walletData.bvn)
            throw new Error('Director BVN is required for institution wallet creation');
        businessName = profile.businessName;
        email = profile.email;
        mobileNumber = profile.phoneNumber;
        firstName = profile.firstName;
        lastName = profile.lastName;
        const payload = {
            customer_identifier: customerId,
            business_name: businessName,
            mobile_num: mobileNumber,
            bvn: walletData.bvn,
        };
        if (walletData.accountNumber)
            payload['beneficiary_account'] = walletData.accountNumber;
        const res = await axios_1.default.post(`${env_1.env.SQUAD_BASE_URL}/virtual-account/business`, payload, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env_1.env.SQUAD_SECRET_KEY}` },
        });
        if (res.status !== 200)
            throw new Error('Unable to create Squad business virtual account');
        responseData = res.data.data;
    }
    const wallet = await wallet_model_1.Wallet.create({
        ownerId: walletData.ownerId,
        ownerType: walletData.ownerType,
        firstName: responseData["first_name"],
        lastName: responseData["last_name"],
        email,
        bvn: (0, crypto_1.encrypt)(bvn),
        address: walletData.address,
        gender: walletData.gender,
        bankCode: responseData['bank_code'],
        accountNumber: responseData['virtual_account_number'],
        mobileNumber,
        settlementAccountNumber: responseData['beneficiary_account'] ?? '',
        customerId: responseData['customer_identifier'],
        balance: 0,
        status: 'active',
        recentFundings: [],
    });
    return wallet;
}
async function getWalletById(id) {
    const wallet = await wallet_model_1.Wallet.findById(id);
    if (!wallet)
        throw new Error('Wallet not found');
    return wallet;
}
async function getWalletByOwner(ownerId, ownerType) {
    const wallet = await wallet_model_1.Wallet.findOne({ ownerId, ownerType });
    if (!wallet)
        throw new Error('Wallet not found for this profile');
    return wallet;
}
async function creditWalletByVirtualAccount(virtualAccountNumber, settledAmountKobo, transactionReference, metadata) {
    const wallet = await wallet_model_1.Wallet.findOneAndUpdate({ accountNumber: virtualAccountNumber }, {
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
    }, { returnDocument: 'after' });
    if (!wallet) {
        console.warn(`[Wallet] Credit webhook for unknown virtual account: ${virtualAccountNumber}`);
        return;
    }
    await auditLog_model_1.AuditLog.create({
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
async function debitWallet(ownerId, ownerType, amountNaira, transactionReference) {
    const wallet = await wallet_model_1.Wallet.findOne({ ownerId, ownerType });
    if (!wallet)
        throw new Error('Wallet not found for this profile');
    if (wallet.balance < amountNaira) {
        throw new Error(`Insufficient wallet balance. Available: ₦${wallet.balance.toLocaleString()}, Required: ₦${amountNaira.toLocaleString()}`);
    }
    await wallet_model_1.Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: -amountNaira } });
    await auditLog_model_1.AuditLog.create({
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
//# sourceMappingURL=wallet.service.js.map