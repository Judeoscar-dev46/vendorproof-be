import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Admin, IAdmin } from '../../models/admin.model';
import { IndividualProfile } from '../../models/individualProfile.model';
import { InstitutionProfile } from '../../models/institutionProfile.model';
import { VendorProfile } from '../../models/vendorProfile.model';
import { env } from '../../config/env';

export interface RegisterDTO {
    name: string;
    email: string;
    passwordRaw: string;
    role: 'admin' | 'officer' | 'viewer';
}

export interface LoginDTO {
    identifier: string;
    passwordRaw: string;
    userType: 'admin' | 'individual' | 'institution' | 'vendor';
}

export async function registerAdmin(dto: RegisterDTO) {
    const existing = await Admin.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
        throw new Error('An admin with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.passwordRaw, salt);

    const newAdmin = await Admin.create({
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
    });

    const adminObj = newAdmin.toObject();
    delete (adminObj as any).passwordHash;

    return adminObj;
}

export async function login(dto: LoginDTO) {
    let user: any = null;

    if (dto.userType === 'admin') {
        user = await Admin.findOne({ email: dto.identifier.toLowerCase() }).select('+passwordHash');
    } else if (dto.userType === 'individual') {
        user = await IndividualProfile.findOne({
            $or: [{ email: dto.identifier.toLowerCase() }, { phoneNumber: dto.identifier }]
        }).select('+passwordHash');
    } else if (dto.userType === 'institution') {
        user = await InstitutionProfile.findOne({
            $or: [{ email: dto.identifier.toLowerCase() }, { phoneNumber: dto.identifier }]
        }).select('+passwordHash');
    } else if (dto.userType === 'vendor') {
        user = await VendorProfile.findOne({
            $or: [{ contactEmail: dto.identifier.toLowerCase() }, { phoneNumber: dto.identifier }]
        }).select('+passwordHash');
    }

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.passwordRaw, user.passwordHash);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    const payload = {
        userId: user._id.toString(),
        email: user.email || user.contactEmail,
        role: dto.userType === 'admin' ? user.role : dto.userType,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1d' });

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return { token, user: userObj, userType: dto.userType };
}
