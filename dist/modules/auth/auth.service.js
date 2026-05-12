"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdmin = registerAdmin;
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const admin_model_1 = require("../../models/admin.model");
const individualProfile_model_1 = require("../../models/individualProfile.model");
const institutionProfile_model_1 = require("../../models/institutionProfile.model");
const vendorProfile_model_1 = require("../../models/vendorProfile.model");
const env_1 = require("../../config/env");
async function registerAdmin(dto) {
    const existing = await admin_model_1.Admin.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
        throw new Error('An admin with this email already exists');
    }
    const salt = await bcrypt_1.default.genSalt(10);
    const passwordHash = await bcrypt_1.default.hash(dto.passwordRaw, salt);
    const newAdmin = await admin_model_1.Admin.create({
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
    });
    const adminObj = newAdmin.toObject();
    delete adminObj.passwordHash;
    return adminObj;
}
async function login(dto) {
    let user = null;
    if (dto.userType === 'admin') {
        user = await admin_model_1.Admin.findOne({ email: dto.identifier.toLowerCase() }).select('+passwordHash');
    }
    else if (dto.userType === 'individual') {
        user = await individualProfile_model_1.IndividualProfile.findOne({
            $or: [{ email: dto.identifier.toLowerCase() }, { phoneNumber: dto.identifier }]
        }).select('+passwordHash');
    }
    else if (dto.userType === 'institution') {
        user = await institutionProfile_model_1.InstitutionProfile.findOne({
            $or: [{ email: dto.identifier.toLowerCase() }, { phoneNumber: dto.identifier }]
        }).select('+passwordHash');
    }
    else if (dto.userType === 'vendor') {
        user = await vendorProfile_model_1.VendorProfile.findOne({
            $or: [{ contactEmail: dto.identifier.toLowerCase() }, { phoneNumber: dto.identifier }]
        }).select('+passwordHash');
    }
    if (!user) {
        throw new Error('Invalid email or password');
    }
    const isMatch = await bcrypt_1.default.compare(dto.passwordRaw, user.passwordHash);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }
    const payload = {
        userId: user._id.toString(),
        email: user.email || user.contactEmail,
        role: dto.userType === 'admin' ? user.role : dto.userType,
    };
    const token = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, { expiresIn: '1d' });
    const userObj = user.toObject();
    delete userObj.passwordHash;
    return { token, user: userObj, userType: dto.userType };
}
//# sourceMappingURL=auth.service.js.map