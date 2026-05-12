"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVerificationRequest = createVerificationRequest;
exports.joinVerificationRequest = joinVerificationRequest;
exports.declineVerificationRequest = declineVerificationRequest;
exports.submitVendorVerification = submitVendorVerification;
exports.getRequestStatus = getRequestStatus;
exports.getRequestDetails = getRequestDetails;
exports.joinVerificationRequestAsGuest = joinVerificationRequestAsGuest;
exports.submitGuestVendorVerification = submitGuestVendorVerification;
exports.convertGuestToVendorProfile = convertGuestToVendorProfile;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const moment_1 = __importDefault(require("moment"));
const env_1 = require("../../config/env");
const verificationRequest_model_1 = require("../../models/verificationRequest.model");
const vendorProfile_model_1 = require("../../models/vendorProfile.model");
const verificationConsent_model_1 = require("../../models/verificationConsent.model");
const institutionProfile_model_1 = require("../../models/institutionProfile.model");
const verification_model_1 = require("../../models/verification.model");
const orchestrator_1 = require("../../ai/orchestrator");
const notificationService_1 = require("../../notifications/notificationService");
const crypto_2 = require("../../utils/crypto");
async function createVerificationRequest(institutionId, dto) {
    if (!dto.vendorEmail && !dto.vendorPhone) {
        throw new Error('At least one of vendorEmail or vendorPhone is required');
    }
    const requestCode = `VP-REQ-${crypto_1.default.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    const request = await verificationRequest_model_1.VerificationRequest.create({
        requestCode,
        institutionId,
        paymentAmount: dto.paymentAmount,
        paymentDescription: dto.paymentDescription,
        expiresAt,
        ...(dto.vendorEmail !== undefined && { vendorEmail: dto.vendorEmail }),
        ...(dto.vendorPhone !== undefined && { vendorPhone: dto.vendorPhone }),
    });
    const institution = await institutionProfile_model_1.InstitutionProfile.findById(institutionId);
    await (0, notificationService_1.sendVerificationRequestNotification)({
        requestCode,
        institutionName: institution?.businessName ?? 'An institution',
        paymentAmount: dto.paymentAmount,
        expiresAt,
        ...(dto.vendorEmail !== undefined && { recipientEmail: dto.vendorEmail }),
        ...(dto.vendorPhone !== undefined && { recipientPhone: dto.vendorPhone }),
    });
    return request;
}
async function joinVerificationRequest(requestCode, vendorProfileId) {
    const request = await verificationRequest_model_1.VerificationRequest.findOne({ requestCode });
    if (!request)
        throw new Error('Verification request not found');
    if (request.status === 'expired')
        throw new Error('This request has expired');
    if (request.status !== 'pending_vendor_action') {
        throw new Error('This request has already been actioned');
    }
    const existingConsent = await verificationConsent_model_1.VerificationConsent.findOne({
        vendorProfileId,
        institutionId: request.institutionId,
        expiresAt: { $gt: new Date() },
        revokedAt: { $exists: false },
    });
    if (existingConsent) {
        const vendorProfile = await vendorProfile_model_1.VendorProfile.findById(vendorProfileId);
        const latestVerification = await verification_model_1.Verification.findOne({ subjectId: vendorProfileId, subjectType: 'vendor' }).sort({ createdAt: -1 });
        await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, {
            vendorProfileId,
            status: vendorProfile?.verificationStatus === 'trusted' ? 'trusted' : 'review',
            trustScore: vendorProfile?.trustScore,
            verdict: vendorProfile?.verificationStatus,
            ...(latestVerification && { verificationId: latestVerification._id }),
        });
        return { reusedExistingProfile: true, request };
    }
    await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, {
        vendorProfileId,
        status: 'in_progress',
    });
    return { reusedExistingProfile: false, request };
}
async function declineVerificationRequest(requestCode, vendorProfileId, reason) {
    const request = await verificationRequest_model_1.VerificationRequest.findOne({ requestCode });
    if (!request)
        throw new Error('Verification request not found');
    await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, {
        vendorProfileId,
        status: 'unverified',
        declinedAt: new Date(),
        declineReason: reason ?? 'Vendor declined to submit documents',
    });
    return { message: 'Request declined' };
}
async function submitVendorVerification(requestCode, vendorProfileId, documentBase64, mediaType, invoiceAmount) {
    const request = await verificationRequest_model_1.VerificationRequest.findOne({ requestCode });
    if (!request)
        throw new Error('Verification request not found');
    if (request.status !== 'in_progress') {
        throw new Error('Request is not in progress');
    }
    if (new Date() > request.expiresAt) {
        await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, { status: 'expired' });
        throw new Error('This request has expired');
    }
    const vendorProfile = await vendorProfile_model_1.VendorProfile
        .findById(vendorProfileId)
        .select('+directorBvn +bankAccount');
    if (!vendorProfile)
        throw new Error('Vendor profile not found');
    const result = await (0, orchestrator_1.runVendorVerification)(vendorProfile, documentBase64, mediaType, invoiceAmount);
    await vendorProfile_model_1.VendorProfile.findByIdAndUpdate(vendorProfileId, {
        trustScore: result.trustScore,
        verificationStatus: result.verdict,
        lastVerifiedAt: new Date(),
        internalFlags: result.allFlags,
    });
    await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, {
        status: result.verdict,
        trustScore: result.trustScore,
        verdict: result.verdict,
        subScores: result.subScores,
        verificationId: result.verificationId,
    });
    await verificationConsent_model_1.VerificationConsent.create({
        vendorProfileId,
        institutionId: request.institutionId,
        requestCode,
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        scoreAtConsent: result.trustScore,
    });
    return result;
}
async function getRequestStatus(requestCode, institutionId) {
    const request = await verificationRequest_model_1.VerificationRequest.findOne({
        requestCode,
        institutionId,
    });
    if (!request)
        throw new Error('Request not found');
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
async function getRequestDetails(requestCode) {
    const request = await verificationRequest_model_1.VerificationRequest.findOne({ requestCode }).populate('institutionId', 'businessName');
    if (!request)
        throw new Error('Verification request not found');
    const institution = request.institutionId;
    return {
        requestCode: request.requestCode,
        paymentAmount: request.paymentAmount,
        paymentDescription: request.paymentDescription,
        institutionName: institution?.businessName ?? 'An institution',
        expiresAt: request.expiresAt,
        status: request.status,
    };
}
async function joinVerificationRequestAsGuest(requestCode, guestDetails) {
    const request = await verificationRequest_model_1.VerificationRequest.findOne({ requestCode });
    if (!request)
        throw new Error('Verification request not found');
    if (request.status === 'expired')
        throw new Error('This request has expired');
    if (request.status !== 'pending_vendor_action') {
        throw new Error('This request has already been actioned');
    }
    const existingProfile = await vendorProfile_model_1.VendorProfile.findOne({
        phoneNumber: guestDetails.phoneNumber
    });
    if (existingProfile) {
        await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, {
            vendorProfileId: existingProfile._id,
            status: 'in_progress',
        });
        return {
            isGuest: false,
            vendorProfileId: String(existingProfile._id),
            message: 'Existing profile found — proceeding with your saved profile',
        };
    }
    const guestToken = crypto_1.default.randomBytes(32).toString('hex');
    await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, {
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
async function submitGuestVendorVerification(requestCode, guestToken, guestDetails, documentBase64, mediaType, invoiceAmount) {
    const request = await verificationRequest_model_1.VerificationRequest.findOne({
        requestCode,
        guestToken,
        status: 'in_progress',
    });
    if (!request)
        throw new Error('Invalid or expired guest session');
    if (new Date() > request.expiresAt) {
        await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, { status: 'expired' });
        throw new Error('This request has expired');
    }
    const tempVendor = {
        _id: new mongoose_1.default.Types.ObjectId(),
        companyName: guestDetails.companyName,
        rcNumber: guestDetails.rcNumber,
        directorBvn: guestDetails.bvn,
        bankAccount: guestDetails.bankAccount,
        bankCode: guestDetails.bankCode,
        address: guestDetails.address,
        registrationDate: (0, moment_1.default)(guestDetails.registrationDate, 'DD/MM/YYYY').toDate(),
        contactEmail: guestDetails.contactEmail,
        phoneNumber: request.guestDetails?.phoneNumber,
    };
    const result = await (0, orchestrator_1.runVendorVerification)(tempVendor, documentBase64, mediaType, invoiceAmount);
    await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, {
        status: result.verdict,
        trustScore: result.trustScore,
        verdict: result.verdict,
        subScores: result.subScores,
        verificationId: result.verificationId,
        guestVerified: true,
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
async function convertGuestToVendorProfile(requestCode, guestToken, accountDetails) {
    const request = await verificationRequest_model_1.VerificationRequest.findOne({
        requestCode,
        guestToken,
        guestVerified: true,
    });
    if (!request)
        throw new Error('No completed guest verification found for this request');
    const existing = await vendorProfile_model_1.VendorProfile.findOne({
        $or: [
            { contactEmail: accountDetails.contactEmail },
            { rcNumber: accountDetails.rcNumber },
        ]
    });
    if (existing)
        throw new Error('An account with this email or RC number already exists');
    const salt = await bcrypt_1.default.genSalt(10);
    const hashedPassword = await bcrypt_1.default.hash(accountDetails.password, salt);
    const vendorProfile = new vendorProfile_model_1.VendorProfile({
        companyName: accountDetails.companyName,
        rcNumber: accountDetails.rcNumber,
        directorBvn: (0, crypto_2.encrypt)(accountDetails.directorBvn),
        bankAccount: accountDetails.bankAccount,
        bankCode: accountDetails.bankCode,
        address: accountDetails.address,
        registrationDate: (0, moment_1.default)(accountDetails.registrationDate, 'DD/MM/YYYY').toDate(),
        contactEmail: accountDetails.contactEmail,
        phoneNumber: accountDetails.phoneNumber,
        passwordHash: hashedPassword,
        trustScore: request.trustScore,
        verificationStatus: request.verdict,
        lastVerifiedAt: new Date(),
    });
    await vendorProfile.save();
    await verificationRequest_model_1.VerificationRequest.findByIdAndUpdate(request._id, {
        vendorProfileId: vendorProfile._id,
    });
    await verificationConsent_model_1.VerificationConsent.create({
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
    const token = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, { expiresIn: '1d' });
    const profileObj = vendorProfile.toObject();
    delete profileObj.passwordHash;
    return { vendorProfile: profileObj, token };
}
//# sourceMappingURL=verificationRequest.service.js.map