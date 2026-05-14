import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import { env } from '../../config/env';
import { VerificationRequest } from '../../models/verificationRequest.model';
import { VendorProfile } from '../../models/vendorProfile.model';
import { VerificationConsent } from '../../models/verificationConsent.model';
import { InstitutionProfile } from '../../models/institutionProfile.model';
import { Verification } from '../../models/verification.model';
import { runVendorVerification } from '../../ai/orchestrator';
import { sendVerificationRequestNotification } from '../../notifications/notificationService';
import { SupportedMediaType } from '../../ai/documentAnalyser';
import { encrypt } from '../../utils/crypto';
import { getWalletByOwner } from '../wallet/wallet.service';

export async function createVerificationRequest(
    institutionId: string,
    dto: {
        vendorEmail?: string;
        vendorPhone?: string;
        paymentAmount: number;
        paymentDescription: string;
    }
) {
    if (!dto.vendorEmail && !dto.vendorPhone) {
        throw new Error('At least one of vendorEmail or vendorPhone is required');
    }

    const requestCode = `VP-REQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
 
    const wallet = await getWalletByOwner(institutionId, 'institution');
    if (wallet.balance < dto.paymentAmount) {
        throw new Error(`Insufficient wallet balance. Available: ₦${wallet.balance.toLocaleString()}, Required: ₦${dto.paymentAmount.toLocaleString()}`);
    }

    const request = await VerificationRequest.create({
        requestCode,
        institutionId,
        paymentAmount: dto.paymentAmount,
        paymentDescription: dto.paymentDescription,
        expiresAt,
        ...(dto.vendorEmail !== undefined && { vendorEmail: dto.vendorEmail }),
        ...(dto.vendorPhone !== undefined && { vendorPhone: dto.vendorPhone }),
    });

    const institution = await InstitutionProfile.findById(institutionId);

    await sendVerificationRequestNotification({
        requestCode,
        institutionName: institution?.businessName ?? 'An institution',
        paymentAmount: dto.paymentAmount,
        expiresAt,
        ...(dto.vendorEmail !== undefined && { recipientEmail: dto.vendorEmail }),
        ...(dto.vendorPhone !== undefined && { recipientPhone: dto.vendorPhone }),
    });

    return request;
}

export async function joinVerificationRequest(
    requestCode: string,
    vendorProfileId: string
) {
    const request = await VerificationRequest.findOne({ requestCode });
    if (!request) throw new Error('Verification request not found');
    if (request.status === 'expired') throw new Error('This request has expired');
    if (request.status !== 'pending_vendor_action') {
        throw new Error('This request has already been actioned');
    }

    const existingConsent = await VerificationConsent.findOne({
        vendorProfileId,
        institutionId: request.institutionId,
        expiresAt: { $gt: new Date() },
        revokedAt: { $exists: false },
    });

    if (existingConsent) {
        const vendorProfile = await VendorProfile.findById(vendorProfileId);
        const latestVerification = await Verification.findOne({ subjectId: vendorProfileId, subjectType: 'vendor' }).sort({ createdAt: -1 });

        await VerificationRequest.findByIdAndUpdate(request._id, {
            vendorProfileId,
            status: vendorProfile?.verificationStatus === 'trusted' ? 'trusted' : 'review',
            trustScore: vendorProfile?.trustScore,
            verdict: vendorProfile?.verificationStatus as 'trusted' | 'review' | 'blocked',
            ...(latestVerification && { verificationId: latestVerification._id }),
        });

        return { reusedExistingProfile: true, request };
    }

    await VerificationRequest.findByIdAndUpdate(request._id, {
        vendorProfileId,
        status: 'in_progress',
    });

    return { reusedExistingProfile: false, request };
}

export async function declineVerificationRequest(
    requestCode: string,
    vendorProfileId: string,
    reason?: string
) {
    const request = await VerificationRequest.findOne({ requestCode });
    if (!request) throw new Error('Verification request not found');

    await VerificationRequest.findByIdAndUpdate(request._id, {
        vendorProfileId,
        status: 'unverified',
        declinedAt: new Date(),
        declineReason: reason ?? 'Vendor declined to submit documents',
    });

    return { message: 'Request declined' };
}

export async function submitVendorVerification(
    requestCode: string,
    vendorProfileId: string,
    documentBase64: string,
    mediaType: SupportedMediaType,
    invoiceAmount?: number
) {
    const request = await VerificationRequest.findOne({ requestCode });
    if (!request) throw new Error('Verification request not found');
    if (request.status !== 'in_progress') {
        throw new Error('Request is not in progress');
    }
    if (new Date() > request.expiresAt) {
        await VerificationRequest.findByIdAndUpdate(request._id, { status: 'expired' });
        throw new Error('This request has expired');
    }

    const vendorProfile = await VendorProfile
        .findById(vendorProfileId)
        .select('+directorBvn +bankAccount');

    if (!vendorProfile) throw new Error('Vendor profile not found');

    const result = await runVendorVerification(vendorProfile, documentBase64, mediaType, invoiceAmount);

    await VendorProfile.findByIdAndUpdate(vendorProfileId, {
        trustScore: result.trustScore,
        verificationStatus: result.verdict,
        lastVerifiedAt: new Date(),
        internalFlags: result.allFlags,
    });

    await VerificationRequest.findByIdAndUpdate(request._id, {
        status: result.verdict,
        trustScore: result.trustScore,
        verdict: result.verdict,
        subScores: result.subScores,
        verificationId: result.verificationId,
    });

    await VerificationConsent.create({
        vendorProfileId,
        institutionId: request.institutionId,
        requestCode,
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        scoreAtConsent: result.trustScore,
    });

    return result;
}

export async function getRequestStatus(requestCode: string, institutionId: string) {
    const request = await VerificationRequest.findOne({
        requestCode,
        institutionId,
    });

    if (!request) throw new Error('Request not found');

    return {
        requestCode: request.requestCode,
        status: request.status,
        paymentAmount: request.paymentAmount,
        paymentDescription: request.paymentDescription,
        trustScore: request.trustScore,
        verdict: request.verdict,
        subScores: request.subScores,
        expiresAt: request.expiresAt,
        createdAt: request.createdAt,
    };
}

export async function getRequestDetails(requestCode: string) {
    const request = await VerificationRequest.findOne({ requestCode }).populate('institutionId', 'businessName').populate({
        path: "verificationId",
    })
    if (!request) throw new Error('Verification request not found');

    const institution = request.institutionId as any;

    return {
        requestCode: request.requestCode,
        paymentAmount: request.paymentAmount,
        paymentDescription: request.paymentDescription,
        institutionName: institution?.businessName ?? 'An institution',
        expiresAt: request.expiresAt,
        status: request.status,
        verification: request.verificationId,
    };
}

export async function joinVerificationRequestAsGuest(
    requestCode: string,
    guestDetails: {
        fullName: string;
        phoneNumber: string;
    }
) {
    const request = await VerificationRequest.findOne({ requestCode });
    if (!request) throw new Error('Verification request not found');
    if (request.status === 'expired') throw new Error('This request has expired');
    if (request.status !== 'pending_vendor_action') {
        throw new Error('This request has already been actioned');
    }

    const existingProfile = await VendorProfile.findOne({
        phoneNumber: guestDetails.phoneNumber
    });

    if (existingProfile) {
        await VerificationRequest.findByIdAndUpdate(request._id, {
            vendorProfileId: existingProfile._id,
            status: 'in_progress',
        });

        return {
            isGuest: false,
            vendorProfileId: String(existingProfile._id),
            message: 'Existing profile found — proceeding with your saved profile',
        };
    }

    const guestToken = crypto.randomBytes(32).toString('hex');

    await VerificationRequest.findByIdAndUpdate(request._id, {
        status: 'in_progress',
        'guestDetails.fullName': guestDetails.fullName,
        'guestDetails.phoneNumber': guestDetails.phoneNumber,
        guestToken,
    });

    return {
        isGuest: true,
        guestToken,
        message: 'Proceed to document upload',
    };
}

export async function submitGuestVendorVerification(
    requestCode: string,
    guestToken: string,
    guestDetails: {
        bvn: string;
        bankAccount: string;
        bankCode: string;
        companyName: string;
        rcNumber: string;
        registrationDate: string;
        address: string;
        contactEmail: string;
    },
    documentBase64: string,
    mediaType: SupportedMediaType,
    invoiceAmount?: number
) {
    const request = await VerificationRequest.findOne({
        requestCode,
        guestToken,
        status: 'in_progress',
    });

    if (!request) throw new Error('Invalid or expired guest session');
    if (new Date() > request.expiresAt) {
        await VerificationRequest.findByIdAndUpdate(request._id, { status: 'expired' });
        throw new Error('This request has expired');
    }

    const tempVendor = {
        _id: new mongoose.Types.ObjectId(),
        companyName: guestDetails.companyName,
        rcNumber: guestDetails.rcNumber,
        directorBvn: guestDetails.bvn,
        bankAccount: guestDetails.bankAccount,
        bankCode: guestDetails.bankCode,
        address: guestDetails.address,
        registrationDate: moment(guestDetails.registrationDate, 'DD/MM/YYYY').toDate(),
        contactEmail: guestDetails.contactEmail,
        phoneNumber: request.guestDetails?.phoneNumber,
    } as any;

    const result = await runVendorVerification(
        tempVendor,
        documentBase64,
        mediaType,
        invoiceAmount
    );

    await VerificationRequest.findByIdAndUpdate(request._id, {
        status: result.verdict,
        trustScore: result.trustScore,
        verdict: result.verdict,
        subScores: result.subScores,
        verificationId: result.verificationId,
        guestVerified: true,
        'guestDetails.bankAccount': guestDetails.bankAccount,
        'guestDetails.bankCode': guestDetails.bankCode,
        'guestDetails.companyName': guestDetails.companyName,
        'guestDetails.rcNumber': guestDetails.rcNumber,
    });

    return {
        trustScore: result.trustScore,
        verdict: result.verdict,
        verdictSummary: result.verdictSummary,
        subScores: result.subScores,
        canCreateAccount: true,
        prefillData: {
            fullName: request.guestDetails?.fullName,
            companyName: guestDetails.companyName,
            rcNumber: guestDetails.rcNumber,
            email: guestDetails.contactEmail,
            phoneNumber: request.guestDetails?.phoneNumber,
        },
    };
}

export async function convertGuestToVendorProfile(
    requestCode: string,
    guestToken: string,
    accountDetails: {
        password: string;
        companyName: string;
        rcNumber: string;
        directorBvn: string;
        bankAccount: string;
        bankCode: string;
        address: string;
        registrationDate: string;
        contactEmail: string;
        phoneNumber: string;
    }
) {
    const request = await VerificationRequest.findOne({
        requestCode,
        guestToken,
        guestVerified: true,
    });

    if (!request) throw new Error('No completed guest verification found for this request');

    const existing = await VendorProfile.findOne({
        $or: [
            { contactEmail: accountDetails.contactEmail },
            { rcNumber: accountDetails.rcNumber },
        ]
    });

    if (existing) throw new Error('An account with this email or RC number already exists');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(accountDetails.password, salt);

    const vendorProfile = new VendorProfile({
        companyName: accountDetails.companyName,
        rcNumber: accountDetails.rcNumber,
        directorBvn: encrypt(accountDetails.directorBvn),
        bankAccount: accountDetails.bankAccount,
        bankCode: accountDetails.bankCode,
        address: accountDetails.address,
        registrationDate: moment(accountDetails.registrationDate, 'DD/MM/YYYY').toDate(),
        contactEmail: accountDetails.contactEmail,
        phoneNumber: accountDetails.phoneNumber,
        passwordHash: hashedPassword,
        trustScore: request.trustScore,
        verificationStatus: request.verdict,
        lastVerifiedAt: new Date(),
    });

    await vendorProfile.save();

    await VerificationRequest.findByIdAndUpdate(request._id, {
        vendorProfileId: vendorProfile._id,
    });

    await VerificationConsent.create({
        vendorProfileId: vendorProfile._id,
        institutionId: request.institutionId,
        requestCode,
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        scoreAtConsent: request.trustScore ?? 0,
    });

    const payload = {
        userId: String(vendorProfile._id),
        email: accountDetails.contactEmail,
        phoneNumber: accountDetails.phoneNumber,
        role: 'vendor',
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1d' });

    const profileObj = vendorProfile.toObject();
    delete (profileObj as any).passwordHash;

    return { vendorProfile: profileObj, token };
}
export async function getAllInstitutionRequests(
    institutionId: string,
    page = 1,
    limit = 50,
    status?: string,
    search?: string
) {
    const skip = (page - 1) * limit;
    const matchQuery: any = { institutionId: new mongoose.Types.ObjectId(institutionId) };

    if (status && status !== 'all') {
        matchQuery.status = status;
    }

    if (search) {
        matchQuery.$or = [
            { requestCode: { $regex: search, $options: 'i' } },
            { vendorEmail: { $regex: search, $options: 'i' } },
            { 'guestDetails.fullName': { $regex: search, $options: 'i' } },
        ];
    }

    // Stats aggregation
    const statsResult = await VerificationRequest.aggregate([
        { $match: { institutionId: new mongoose.Types.ObjectId(institutionId) } },
        {
            $group: {
                _id: null,
                totalVolume: { $sum: 1 },
                highTrust: { $sum: { $cond: [{ $eq: ['$verdict', 'trusted'] }, 1, 0] } },
                pendingAI: { $sum: { $cond: [{ $in: ['$status', ['pending_vendor_action', 'in_progress']] }, 1, 0] } },
                securityBlocks: { $sum: { $cond: [{ $eq: ['$verdict', 'blocked'] }, 1, 0] } },
            },
        },
    ]);

    const stats = statsResult[0] || {
        totalVolume: 0,
        highTrust: 0,
        pendingAI: 0,
        securityBlocks: 0,
    };
    delete (stats as any)._id;

    const [requests, total] = await Promise.all([
        VerificationRequest.find(matchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('vendorProfileId', 'companyName contactEmail'),
        VerificationRequest.countDocuments(matchQuery),
    ]);

    return {
        stats,
        requests: requests.map(r => ({
            requestCode: r.requestCode,
            vendorName: (r.vendorProfileId as any)?.companyName || r.guestDetails?.fullName || 'N/A',
            vendorEmail: (r.vendorProfileId as any)?.contactEmail || r.vendorEmail || 'N/A',
            paymentAmount: r.paymentAmount,
            trustScore: r.trustScore ?? null,
            status: r.status,
            verdict: r.verdict ?? null,
            createdAt: r.createdAt,
        })),
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getInstitutionRequestDetails(requestCode: string, institutionId: string) {
    const request = await VerificationRequest.findOne({
        requestCode,
        institutionId,
    })
        .populate('vendorProfileId', 'companyName contactEmail phoneNumber verificationStatus trustScore lastVerifiedAt')
        .populate('verificationId');

    if (!request) throw new Error('Verification request not found');

    const vendor = request.vendorProfileId as any;

    return {
        requestCode: request.requestCode,
        status: request.status,
        paymentAmount: request.paymentAmount,
        paymentDescription: request.paymentDescription,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt,
        declinedAt: request.declinedAt,
        declineReason: request.declineReason,
        vendorName: vendor?.companyName || request.guestDetails?.fullName || 'N/A',
        vendorEmail: vendor?.contactEmail || request.vendorEmail || 'N/A',
        vendorPhone: vendor?.phoneNumber || request.vendorPhone || request.guestDetails?.phoneNumber || 'N/A',
        vendorProfileId: vendor?._id || null,
        isGuest: !!request.guestToken || !request.vendorProfileId,
        trustScore: request.trustScore,
        verdict: request.verdict,
        subScores: request.subScores,
        verificationId: request.verificationId?._id || request.verificationId,
        verification: request.verificationId ? {
            ...(request.verificationId as any).toObject(),
            flags: coatFlags((request.verificationId as any).flags),
            claudeReasoning: sanitizeReasoning((request.verificationId as any).claudeReasoning)
        } : null,
        vendorJoinedAt: request.status !== 'pending_vendor_action' ? (request as any).updatedAt : null,
    };
}

export async function approveVerificationRequest(requestCode: string, institutionId: string) {
    const request = await VerificationRequest.findOne({
        requestCode,
        institutionId,
    });

    if (!request) throw new Error('Verification request not found');
    if (request.status !== 'review') {
        throw new Error('Only requests in "review" status can be manually approved');
    }

    request.status = 'trusted';
    request.verdict = 'trusted';
    request.trustScore = 100;

    request.subScores = {
        documentScore: 100,
        anomalyScore: 100,
        networkScore: 100
    };

    await request.save();

    if (request.verificationId) {
        await Verification.findByIdAndUpdate(request.verificationId, {
            verdict: 'trusted',
            trustScore: 100,
            subScores: {
                documentScore: 100,
                anomalyScore: 100,
                networkScore: 100
            }
        });
    }

    return { message: 'Request manually approved' };
}

function coatFlags(flags: any[] | undefined): string[] {
    if (!flags || !Array.isArray(flags) || flags.length === 0) return [];

    const mapping: Record<string, string> = {
        'BVN name mismatch': 'Identity detail discrepancy',
        'BVN not found': 'Identity record not found',
        'BVN date of birth mismatch': 'Identity detail discrepancy',
        'RC Number mismatch': 'Business registration discrepancy',
        'RC Number not found': 'Business registration not found',
        'Document RC mismatch': 'Company name/RC mismatch',
        'Document name mismatch': 'Identity name mismatch',
        'Face mismatch': 'Biometric verification failure',
        'Low trust score': 'General risk flag',
        'Document tampered': 'Image integrity concern',
        'Metadata discrepancy': 'Device/Metadata anomaly',
    };

    return flags.map(f => {
        const flagStr = String(f);

        if (mapping[flagStr] !== undefined) return mapping[flagStr];

        const lowerF = flagStr.toLowerCase();
        if (lowerF.includes('bvn')) return 'Identity record anomaly';
        if (lowerF.includes('rc number') || lowerF.includes('cac')) return 'Business record anomaly';
        if (lowerF.includes('face') || lowerF.includes('biometric')) return 'Biometric integrity flag';
        if (lowerF.includes('document') || lowerF.includes('image') || lowerF.includes('tamper')) return 'Document integrity flag';
        if (lowerF.includes('location') || lowerF.includes('ip') || lowerF.includes('proxy')) return 'Network anomaly detected';

        return 'System security alert';
    }) as string[];
}

function sanitizeReasoning(reasoning: string): string {
    if (!reasoning) return 'No analysis details available.';

    let sanitized = reasoning.replace(/\b\d{11}\b/g, '[REDACTED ID]');

    sanitized = sanitized.replace(/\b(RC|BN|IT|LLP|LP|CAC)\s?\d{5,10}\b/gi, '[REDACTED REG]');

    sanitized = sanitized.replace(/\b(\+?234|0)\d{10}\b/g, '[REDACTED PHONE]');

    sanitized = sanitized.replace(/(mismatch with|instead of|found|extracted)\s+['"][^'"]+['"]/gi, ' [REDACTED VALUE]');

    return sanitized;
}
