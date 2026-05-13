import { VendorProfile, IVendorProfile } from '../../models/vendorProfile.model';
import { Verification } from '../../models/verification.model';
import { encrypt } from '../../utils/crypto';

export interface CreateVendorDTO {
    companyName: string;
    rcNumber: string;
    directorBvn: string;
    bankAccount: string;
    bankCode: string;
    address: string;
    registrationDate: Date;
    contactEmail: string;
    phoneNumber: string;
}

export interface VendorFilters {
    status?: IVendorProfile['verificationStatus'] | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}

export async function createVendor(dto: CreateVendorDTO): Promise<IVendorProfile> {
    const existing = await VendorProfile.findOne({ rcNumber: dto.rcNumber });
    if (existing) {
        throw new Error(`A vendor with RC number ${dto.rcNumber} already exists`);
    }

    const vendor = await VendorProfile.create({
        ...dto,
        directorBvn: encrypt(dto.directorBvn),
    });
    return vendor;
}

export async function getVendorById(id: string): Promise<IVendorProfile> {
    const vendor = await VendorProfile.findById(id);
    if (!vendor) throw new Error('Vendor not found');
    return vendor;
}

export async function getAllVendors(filters: VendorFilters): Promise<{
    vendors: IVendorProfile[];
    total: number;
    page: number;
    totalPages: number;
}> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

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
        VendorProfile.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-directorBvn -bankAccount'),
        VendorProfile.countDocuments(query),
    ]);

    return {
        vendors,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

export async function updateVendorStatus(
    id: string,
    status: IVendorProfile['verificationStatus'],
    reason?: string
): Promise<IVendorProfile> {
    const vendor = await VendorProfile.findById(id);
    if (!vendor) throw new Error('Vendor not found');

    vendor.verificationStatus = status;
    await vendor.save();

    return vendor;
}

export async function deleteVendor(id: string): Promise<void> {
    const vendor = await VendorProfile.findById(id);
    if (!vendor) throw new Error('Vendor not found');

    const paidVerification = await Verification.findOne({
        vendorId: vendor._id,
        paymentReleased: true,
    });

    if (paidVerification) {
        throw new Error('Cannot delete a vendor with released payments — archive instead');
    }

    await VendorProfile.findByIdAndDelete(id);
    await Verification.deleteMany({ vendorId: id });
}

export async function getVendorWithVerifications(id: string) {
    const vendor = await VendorProfile.findById(id);
    if (!vendor) throw new Error('Vendor not found');

    const verifications = await Verification.find({ vendorId: id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('trustScore verdict flags createdAt paymentReleased squadTransactionRef');

    return { vendor, verifications };
}