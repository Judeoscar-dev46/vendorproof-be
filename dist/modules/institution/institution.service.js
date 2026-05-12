"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstitutionDashboard = getInstitutionDashboard;
exports.createInstitutionProfile = createInstitutionProfile;
exports.getInstitutionProfile = getInstitutionProfile;
exports.updateInstitutionProfile = updateInstitutionProfile;
exports.getInstitutionVerificationRequests = getInstitutionVerificationRequests;
const bcrypt_1 = __importDefault(require("bcrypt"));
const institutionProfile_model_1 = require("../../models/institutionProfile.model");
const verificationRequest_model_1 = require("../../models/verificationRequest.model");
const wallet_model_1 = require("../../models/wallet.model");
async function getInstitutionDashboard(institutionId) {
    const institution = await institutionProfile_model_1.InstitutionProfile.findById(institutionId);
    if (!institution)
        throw new Error('Institution profile not found');
    const wallet = await wallet_model_1.Wallet.findOne({ ownerId: institutionId, ownerType: 'institution' });
    // Aggregate statistics
    const statsResult = await verificationRequest_model_1.VerificationRequest.aggregate([
        { $match: { institutionId: institution._id } },
        {
            $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                trusted: { $sum: { $cond: [{ $eq: ['$status', 'trusted'] }, 1, 0] } },
                review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
                blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
                unverified: { $sum: { $cond: [{ $eq: ['$status', 'unverified'] }, 1, 0] } },
                expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
                pendingVendorAction: { $sum: { $cond: [{ $eq: ['$status', 'pending_vendor_action'] }, 1, 0] } },
            },
        },
    ]);
    const stats = statsResult[0] || {
        totalRequests: 0,
        trusted: 0,
        review: 0,
        blocked: 0,
        unverified: 0,
        expired: 0,
        pendingVendorAction: 0,
    };
    delete stats._id;
    // Fetch 5 most recent requests
    const recentRequests = await verificationRequest_model_1.VerificationRequest.find({ institutionId: institution._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('vendorProfileId', 'companyName')
        .select('requestCode status paymentAmount trustScore verdict createdAt guestDetails vendorProfileId');
    return {
        institution: {
            id: institution._id,
            name: institution.businessName,
            rcNumber: institution.rcNumber,
            email: institution.email,
            unverifiedVendorPolicy: institution.unverifiedVendorPolicy,
        },
        wallet: {
            internalBalance: wallet?.balance || 0,
            currency: 'NGN',
        },
        stats,
        recentRequests: recentRequests.map(r => ({
            requestCode: r.requestCode,
            vendorName: r.vendorProfileId?.companyName || r.guestDetails?.fullName || 'Unknown Vendor',
            paymentAmount: r.paymentAmount,
            status: r.status,
            trustScore: r.trustScore ?? null,
            verdict: r.verdict ?? null,
            createdAt: r.createdAt,
        })),
    };
}
async function createInstitutionProfile(dto) {
    const existing = await institutionProfile_model_1.InstitutionProfile.findOne({
        $or: [{ email: dto.email }, { rcNumber: dto.rcNumber }],
    });
    if (existing) {
        throw new Error('An institution profile with this email or RC number already exists');
    }
    const salt = await bcrypt_1.default.genSalt(10);
    const passwordHash = await bcrypt_1.default.hash(dto.passwordRaw, salt);
    const profile = await institutionProfile_model_1.InstitutionProfile.create({
        businessName: dto.businessName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        rcNumber: dto.rcNumber,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        address: dto.address,
        ...(dto.unverifiedVendorPolicy !== undefined && { unverifiedVendorPolicy: dto.unverifiedVendorPolicy }),
        passwordHash,
    });
    const profileObj = profile.toObject();
    delete profileObj.passwordHash;
    return profileObj;
}
async function getInstitutionProfile(id) {
    const profile = await institutionProfile_model_1.InstitutionProfile.findById(id);
    if (!profile)
        throw new Error('Institution profile not found');
    return profile;
}
async function updateInstitutionProfile(id, dto) {
    const profile = await institutionProfile_model_1.InstitutionProfile.findById(id);
    if (!profile)
        throw new Error('Institution profile not found');
    if (dto.businessName)
        profile.businessName = dto.businessName;
    if (dto.firstName)
        profile.firstName = dto.firstName;
    if (dto.lastName)
        profile.lastName = dto.lastName;
    if (dto.email)
        profile.email = dto.email;
    if (dto.phoneNumber)
        profile.phoneNumber = dto.phoneNumber;
    if (dto.address)
        profile.address = dto.address;
    if (dto.unverifiedVendorPolicy)
        profile.unverifiedVendorPolicy = dto.unverifiedVendorPolicy;
    await profile.save();
    return profile;
}
async function getInstitutionVerificationRequests(institutionId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
        verificationRequest_model_1.VerificationRequest.find({ institutionId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('requestCode status paymentAmount paymentDescription trustScore verdict expiresAt createdAt'),
        verificationRequest_model_1.VerificationRequest.countDocuments({ institutionId }),
    ]);
    return {
        requests,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}
//# sourceMappingURL=institution.service.js.map