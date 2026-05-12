"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndividualProfile = createIndividualProfile;
exports.getIndividualProfile = getIndividualProfile;
exports.updateIndividualProfile = updateIndividualProfile;
exports.getIndividualVerificationHistory = getIndividualVerificationHistory;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = require("../../utils/crypto");
const individualProfile_model_1 = require("../../models/individualProfile.model");
const verification_model_1 = require("../../models/verification.model");
async function createIndividualProfile(dto) {
    const existing = await individualProfile_model_1.IndividualProfile.findOne({ phoneNumber: dto.phoneNumber });
    if (existing) {
        throw new Error(`An individual profile with phone number ${dto.phoneNumber} already exists`);
    }
    const salt = await bcrypt_1.default.genSalt(10);
    const passwordHash = await bcrypt_1.default.hash(dto.passwordRaw, salt);
    const encryptedBvn = (0, crypto_1.encrypt)(dto.bvn);
    const profile = await individualProfile_model_1.IndividualProfile.create({
        fullName: dto.fullName,
        bvn: encryptedBvn,
        bankAccount: dto.bankAccount,
        bankCode: dto.bankCode,
        phoneNumber: dto.phoneNumber,
        dateOfBirth: new Date(dto.dateOfBirth),
        ...(dto.ninNumber !== undefined && { ninNumber: dto.ninNumber }),
        ...(dto.email !== undefined && { email: dto.email }),
        passwordHash,
    });
    const profileObj = profile.toObject();
    delete profileObj.passwordHash;
    delete profileObj.bvn;
    return profileObj;
}
async function getIndividualProfile(id) {
    const profile = await individualProfile_model_1.IndividualProfile.findById(id);
    if (!profile)
        throw new Error('Individual profile not found');
    return profile;
}
async function updateIndividualProfile(id, dto) {
    const profile = await individualProfile_model_1.IndividualProfile.findById(id);
    if (!profile)
        throw new Error('Individual profile not found');
    if (dto.fullName)
        profile.fullName = dto.fullName;
    if (dto.ninNumber !== undefined)
        profile.ninNumber = dto.ninNumber;
    if (dto.bankCode)
        profile.bankCode = dto.bankCode;
    if (dto.phoneNumber)
        profile.phoneNumber = dto.phoneNumber;
    if (dto.email !== undefined)
        profile.email = dto.email;
    if (dto.dateOfBirth)
        profile.dateOfBirth = new Date(dto.dateOfBirth);
    await profile.save();
    return profile;
}
async function getIndividualVerificationHistory(id) {
    const profile = await individualProfile_model_1.IndividualProfile.findById(id);
    if (!profile)
        throw new Error('Individual profile not found');
    const verifications = await verification_model_1.Verification.find({
        subjectId: id,
        subjectType: 'individual',
    })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('trustScore verdict flags subScores createdAt');
    return { profile, verifications };
}
//# sourceMappingURL=individual.service.js.map