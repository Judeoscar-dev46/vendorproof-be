"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiatePayment = initiatePayment;
exports.getPaymentStatus = getPaymentStatus;
exports.getVendorPayments = getVendorPayments;
exports.lookupAccount = lookupAccount;
exports.fundTransfer = fundTransfer;
exports.processWebhook = processWebhook;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
const verification_model_1 = require("../../models/verification.model");
const verificationRequest_model_1 = require("../../models/verificationRequest.model");
const vendor_model_1 = require("../../models/vendor.model");
const auditLog_model_1 = require("../../models/auditLog.model");
const wallet_service_1 = require("../wallet/wallet.service");
const vendorProfile_model_1 = require("../../models/vendorProfile.model");
const MERCHAT_ID = env_1.env.SQUAD_MERCHANT_ID;
async function initiatePayment(dto) {
    const verification = await verification_model_1.Verification.findById(dto.verificationId);
    if (!verification)
        throw new Error('Verification not found');
    const verificationRequest = await verificationRequest_model_1.VerificationRequest.findOne({ verificationId: dto.verificationId });
    const finalAmount = dto.amount ?? verificationRequest?.paymentAmount;
    const finalNarration = dto.narration ?? verificationRequest?.paymentDescription;
    if (!finalAmount) {
        throw new Error('Amount is required. Please provide an amount or ensure this verification is linked to a request.');
    }
    if (verification.verdict !== 'trusted') {
        throw new Error(`Payment blocked: vendor verdict is "${verification.verdict}" — trust score ${verification.trustScore}/100. Minimum required is 80.`);
    }
    if (verification.paymentReleased) {
        throw new Error(`Payment already released for this verification. Transaction ref: ${verification.squadTransactionRef}`);
    }
    const vendor = await vendor_model_1.Vendor.findById(verification.vendorId);
    if (!vendor)
        throw new Error('Vendor not found');
    if (vendor.status === 'blocked') {
        throw new Error('Payment blocked: vendor account has been blocked since this verification was run');
    }
    const transactionRef = `${MERCHAT_ID}-${dto.verificationId}`;
    const squadPayload = {
        transaction_reference: transactionRef,
        amount: `${Math.round(finalAmount * 100)}`,
        bank_code: vendor.bankCode,
        account_number: vendor.bankAccount,
        account_name: vendor.companyName,
        currency_id: 'NGN',
        remark: finalNarration ?? `VendorProof verified payment | Score: ${verification.trustScore}/100 | Ref: ${transactionRef}`,
    };
    let squadResponse;
    try {
        const response = await axios_1.default.post(`${env_1.env.SQUAD_BASE_URL}/payout/transfer`, squadPayload, {
            headers: {
                Authorization: `Bearer ${env_1.env.SQUAD_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
        squadResponse = response.data;
    }
    catch (err) {
        const axiosErr = err;
        const squadMessage = axiosErr.response?.data?.message ?? axiosErr.message;
        throw new Error(`Squad API error: ${squadMessage}`);
    }
    await verification_model_1.Verification.findByIdAndUpdate(dto.verificationId, {
        paymentReleased: true,
        squadTransactionRef: transactionRef,
    });
    await auditLog_model_1.AuditLog.create({
        action: 'PAYMENT_RELEASED',
        vendorId: vendor._id,
        referenceId: dto.verificationId,
        metadata: {
            transactionRef,
            amount: finalAmount,
            trustScore: verification.trustScore,
        },
    });
    return {
        transactionRef,
        amount: finalAmount,
        status: 'initiated',
        vendorName: vendor.companyName,
        trustScore: verification.trustScore,
        squadResponse,
    };
}
async function getPaymentStatus(verificationId) {
    const verification = await verification_model_1.Verification.findById(verificationId)
        .populate('vendorId', 'companyName rcNumber bankAccount');
    if (!verification)
        throw new Error('Verification not found');
    if (!verification.paymentReleased || !verification.squadTransactionRef) {
        return {
            paymentReleased: false,
            message: 'No payment has been released for this verification',
            verification: {
                id: verification._id,
                verdict: verification.verdict,
                trustScore: verification.trustScore,
            },
        };
    }
    let squadStatus = {};
    try {
        const response = await axios_1.default.get(`${env_1.env.SQUAD_BASE_URL}/payout/${verification.squadTransactionRef}`, {
            headers: {
                Authorization: `Bearer ${env_1.env.SQUAD_SECRET_KEY}`,
            },
            timeout: 10000,
        });
        squadStatus = response.data;
    }
    catch (err) {
        squadStatus = { error: 'Could not reach Squad API for live status' };
    }
    return {
        paymentReleased: true,
        transactionRef: verification.squadTransactionRef,
        trustScore: verification.trustScore,
        vendor: verification.vendorId,
        squadStatus,
    };
}
async function getVendorPayments(vendorId) {
    const vendor = await vendorProfile_model_1.VendorProfile.findById(vendorId);
    if (!vendor)
        throw new Error('Vendor not found');
    const payments = await verification_model_1.Verification.find({
        vendorId,
        paymentReleased: true,
    })
        .sort({ createdAt: -1 })
        .select('trustScore verdict squadTransactionRef createdAt flags subScores');
    const totalPaid = payments.length;
    return {
        vendor: {
            id: vendor._id,
            companyName: vendor.companyName,
            rcNumber: vendor.rcNumber,
            status: vendor.verificationStatus,
        },
        totalPayments: totalPaid,
        payments,
    };
}
async function lookupAccount(bankCode, accountNumber) {
    try {
        const response = await axios_1.default.get(`${env_1.env.SQUAD_BASE_URL}/payout/account/lookup`, {
            params: { account_number: accountNumber, bank_code: bankCode },
            headers: {
                Authorization: `Bearer ${env_1.env.SQUAD_SECRET_KEY}`,
            },
            timeout: 10000,
        });
        return response.data.data;
    }
    catch (err) {
        const axiosErr = err;
        const msg = axiosErr.response?.data?.message ?? axiosErr.message;
        throw new Error(`Account lookup failed: ${msg}`);
    }
}
async function fundTransfer(dto) {
    try {
        const response = await axios_1.default.post(`${env_1.env.SQUAD_BASE_URL}/payout/initiate`, {
            transaction_ref: dto.transactionReference,
            amount: Math.round(dto.amount * 100),
            bank_code: dto.bankCode,
            account_number: dto.accountNumber,
            account_name: dto.accountName,
            currency_id: 'NGN',
            remark: dto.remark,
        }, {
            headers: {
                Authorization: `Bearer ${env_1.env.SQUAD_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
        return response.data;
    }
    catch (err) {
        const axiosErr = err;
        const msg = axiosErr.response?.data?.message ?? axiosErr.message;
        throw new Error(`Fund transfer failed: ${msg}`);
    }
}
async function processWebhook(payload, signature) {
    const expectedSignature = crypto_1.default
        .createHmac('sha512', env_1.env.SQUAD_SECRET_KEY)
        .update(JSON.stringify(payload))
        .digest('hex')
        .toUpperCase();
    if (signature.toUpperCase() !== expectedSignature) {
        throw new Error('Invalid webhook signature');
    }
    const body = (payload['Body'] ?? payload);
    const virtualAccountNumber = body['virtual_account_number'];
    if (virtualAccountNumber) {
        const settledAmountKobo = Number(body['settled_amount'] ?? body['amount'] ?? 0);
        console.log(settledAmountKobo);
        const transactionReference = (body['transaction_reference'] ?? payload['TransactionRef'] ?? '');
        await (0, wallet_service_1.creditWalletByVirtualAccount)(virtualAccountNumber, settledAmountKobo, transactionReference, { rawPayload: payload });
        return;
    }
    const { transaction_ref, status } = payload;
    if (!transaction_ref)
        return;
    const verification = await verification_model_1.Verification.findOne({ squadTransactionRef: transaction_ref });
    if (!verification)
        return;
    await auditLog_model_1.AuditLog.create({
        action: 'PAYMENT_WEBHOOK',
        ...(verification.vendorId !== undefined && { vendorId: verification.vendorId }),
        referenceId: String(verification._id),
        metadata: { transaction_ref, status, rawPayload: payload },
    });
}
//# sourceMappingURL=payment.service.js.map