import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { env } from '../../config/env';
import { Verification } from '../../models/verification.model';
import { VerificationRequest } from '../../models/verificationRequest.model';
import { Vendor } from '../../models/vendor.model';
import { AuditLog } from '../../models/auditLog.model';
import { creditWalletByVirtualAccount } from '../wallet/wallet.service'
import { VendorProfile } from '../../models/vendorProfile.model';

export interface InitiatePaymentDTO {
    verificationId: string;
    amount?: number | undefined;
    narration?: string | undefined;
}

export interface PaymentResult {
    transactionRef: string;
    amount: number;
    status: string;
    vendorName: string;
    trustScore: number;
    squadResponse: Record<string, unknown>;
}

const MERCHAT_ID = env.SQUAD_MERCHANT_ID

export async function initiatePayment(dto: InitiatePaymentDTO): Promise<PaymentResult> {
    const verification = await Verification.findById(dto.verificationId);
    if (!verification) throw new Error('Verification not found');

    const verificationRequest = await VerificationRequest.findOne({ verificationId: dto.verificationId });

    const finalAmount = dto.amount ?? verificationRequest?.paymentAmount;
    const finalNarration = dto.narration ?? verificationRequest?.paymentDescription;

    if (!finalAmount) {
        throw new Error('Amount is required. Please provide an amount or ensure this verification is linked to a request.');
    }

    if (verification.verdict !== 'trusted') {
        throw new Error(
            `Payment blocked: vendor verdict is "${verification.verdict}" — trust score ${verification.trustScore}/100. Minimum required is 80.`
        );
    }

    if (verification.paymentReleased) {
        throw new Error(
            `Payment already released for this verification. Transaction ref: ${verification.squadTransactionRef}`
        );
    }

    const vendor = await Vendor.findById(verification.vendorId);
    if (!vendor) throw new Error('Vendor not found');

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

    let squadResponse: Record<string, unknown>;

    try {
        const response = await axios.post(
            `${env.SQUAD_BASE_URL}/payout/transfer`,
            squadPayload,
            {
                headers: {
                    Authorization: `Bearer ${env.SQUAD_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            }
        );
        squadResponse = response.data;
    } catch (err) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        const squadMessage = axiosErr.response?.data?.message ?? axiosErr.message;
        throw new Error(`Squad API error: ${squadMessage}`);
    }

    await Verification.findByIdAndUpdate(dto.verificationId, {
        paymentReleased: true,
        squadTransactionRef: transactionRef,
    });

    await AuditLog.create({
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

export async function getPaymentStatus(verificationId: string) {
    const verification = await Verification.findById(verificationId)
        .populate('vendorId', 'companyName rcNumber bankAccount');

    if (!verification) throw new Error('Verification not found');

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

    let squadStatus: Record<string, unknown> = {};

    try {
        const response = await axios.get(
            `${env.SQUAD_BASE_URL}/payout/${verification.squadTransactionRef}`,
            {
                headers: {
                    Authorization: `Bearer ${env.SQUAD_SECRET_KEY}`,
                },
                timeout: 10000,
            }
        );
        squadStatus = response.data;
    } catch (err) {
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

export async function getVendorPayments(vendorId: string) {
    const vendor = await VendorProfile.findById(vendorId);
    if (!vendor) throw new Error('Vendor not found');

    const payments = await Verification.find({
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

export async function lookupAccount(
    bankCode: string,
    accountNumber: string
): Promise<{ account_number: string; account_name: string; bank_code: string }> {
    try {
        const response = await axios.get(
            `${env.SQUAD_BASE_URL}/payout/account/lookup`,
            {
                params: { account_number: accountNumber, bank_code: bankCode },
                headers: {
                    Authorization: `Bearer ${env.SQUAD_SECRET_KEY}`,
                },
                timeout: 10000,
            }
        );
        return response.data.data;
    } catch (err) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        const msg = axiosErr.response?.data?.message ?? axiosErr.message;
        throw new Error(`Account lookup failed: ${msg}`);
    }
}

export async function fundTransfer(dto: {
    transactionReference: string;
    amount: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    remark: string;
}): Promise<Record<string, unknown>> {
    try {
        const response = await axios.post(
            `${env.SQUAD_BASE_URL}/payout/initiate`,
            {
                transaction_ref: dto.transactionReference,
                amount: Math.round(dto.amount * 100),
                bank_code: dto.bankCode,
                account_number: dto.accountNumber,
                account_name: dto.accountName,
                currency_id: 'NGN',
                remark: dto.remark,
            },
            {
                headers: {
                    Authorization: `Bearer ${env.SQUAD_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            }
        );
        return response.data;
    } catch (err) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        const msg = axiosErr.response?.data?.message ?? axiosErr.message;
        throw new Error(`Fund transfer failed: ${msg}`);
    }
}

export async function processWebhook(
    payload: Record<string, unknown>,
    signature: string
): Promise<void> {
    const expectedSignature = crypto
        .createHmac('sha512', env.SQUAD_SECRET_KEY)
        .update(JSON.stringify(payload))
        .digest('hex')
        .toUpperCase();

    if (signature.toUpperCase() !== expectedSignature) {
        throw new Error('Invalid webhook signature');
    }

    const body = (payload['Body'] ?? payload) as Record<string, unknown>;
    const virtualAccountNumber = body['virtual_account_number'] as string | undefined;

    if (virtualAccountNumber) {
        const settledAmountKobo = Number(body['settled_amount'] ?? body['amount'] ?? 0);
        console.log(settledAmountKobo)
        const transactionReference = (body['transaction_reference'] ?? payload['TransactionRef'] ?? '') as string;

        await creditWalletByVirtualAccount(
            virtualAccountNumber,
            settledAmountKobo,
            transactionReference,
            { rawPayload: payload }
        );
        return;
    }

    const { transaction_ref, status } = payload as {
        transaction_ref: string;
        status: string;
    };

    if (!transaction_ref) return;

    const verification = await Verification.findOne({ squadTransactionRef: transaction_ref });
    if (!verification) return;

    await AuditLog.create({
        action: 'PAYMENT_WEBHOOK',
        ...(verification.vendorId !== undefined && { vendorId: verification.vendorId }),
        referenceId: String(verification._id),
        metadata: { transaction_ref, status, rawPayload: payload },
    });
}