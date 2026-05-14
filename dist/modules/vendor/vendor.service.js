"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVendor = createVendor;
exports.getVendorById = getVendorById;
exports.getAllVendors = getAllVendors;
exports.updateVendorStatus = updateVendorStatus;
exports.deleteVendor = deleteVendor;
exports.getVendorWithVerifications = getVendorWithVerifications;
const vendorProfile_model_1 = require("../../models/vendorProfile.model");
const verification_model_1 = require("../../models/verification.model");
const crypto_1 = require("../../utils/crypto");
async function createVendor(dto) {
    const existing = await vendorProfile_model_1.VendorProfile.findOne({ rcNumber: dto.rcNumber });
    if (existing) {
        throw new Error(`A vendor with RC number ${dto.rcNumber} already exists`);
    }
    const vendor = await vendorProfile_model_1.VendorProfile.create({
        ...dto,
        directorBvn: (0, crypto_1.encrypt)(dto.directorBvn),
    });
    return vendor;
}
async function getVendorById(id) {
    const vendor = await vendorProfile_model_1.VendorProfile.findById(id);
    if (!vendor)
        throw new Error('Vendor not found');
    return vendor;
}
async function getAllVendors(filters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const query = {};
    if (filters.status) {
        query.verificationStatus = filters.status;
    }
    if (filters.search) {
        query.$or = [
            { companyName: { $regex: filters.search, $options: 'i' } },
            { rcNumber: { $regex: filters.search, $options: 'i' } },
            { contactEmail: { $regex: filters.search, $options: 'i' } },
        ];
    }
    const [vendors, total] = await Promise.all([
        vendorProfile_model_1.VendorProfile.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-directorBvn -bankAccount'),
        vendorProfile_model_1.VendorProfile.countDocuments(query),
    ]);
    return {
        vendors,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}
async function updateVendorStatus(id, status, reason) {
    const vendor = await vendorProfile_model_1.VendorProfile.findById(id);
    if (!vendor)
        throw new Error('Vendor not found');
    vendor.verificationStatus = status;
    await vendor.save();
    return vendor;
}
async function deleteVendor(id) {
    const vendor = await vendorProfile_model_1.VendorProfile.findById(id);
    if (!vendor)
        throw new Error('Vendor not found');
    const paidVerification = await verification_model_1.Verification.findOne({
        vendorId: vendor._id,
        paymentReleased: true,
    });
    if (paidVerification) {
        throw new Error('Cannot delete a vendor with released payments — archive instead');
    }
    await vendorProfile_model_1.VendorProfile.findByIdAndDelete(id);
    await verification_model_1.Verification.deleteMany({ vendorId: id });
}
async function getVendorWithVerifications(id) {
    const vendor = await vendorProfile_model_1.VendorProfile.findById(id);
    if (!vendor)
        throw new Error('Vendor not found');
    const verifications = await verification_model_1.Verification.find({ vendorId: id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('trustScore verdict flags createdAt paymentReleased squadTransactionRef');
    return { vendor, verifications };
}
//# sourceMappingURL=vendor.service.js.map