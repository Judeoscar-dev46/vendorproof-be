import mongoose from 'mongoose';
import { VendorProfile } from '../models/vendorProfile.model';
import { env } from '../config/env';
import { encrypt } from '../utils/crypto';

const nigerianBanks = [
    { code: '044', name: 'Access Bank' },
    { code: '058', name: 'GTBank' },
    { code: '011', name: 'First Bank' },
    { code: '057', name: 'Zenith Bank' },
];

function randomDate(yearsBack: number): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() - Math.random() * yearsBack);
    return d;
}

function generateVendor(isFraud = false) {
    const bank = nigerianBanks[Math.floor(Math.random() * nigerianBanks.length)];
    const base = {
        companyName: `${['Alpha', 'Beta', 'Delta', 'Omega'][Math.floor(Math.random() * 4)]} ${['Solutions', 'Ventures', 'Services', 'Enterprises'][Math.floor(Math.random() * 4)]} Ltd`,
        rcNumber: `RC${Math.floor(100000 + Math.random() * 899999)}`,
        directorBvn: encrypt(`${Math.floor(10000000000 + Math.random() * 89999999999)}`),
        bankAccount: `${Math.floor(1000000000 + Math.random() * 8999999999)}`,
        bankCode: bank?.code,
        address: `${Math.floor(1 + Math.random() * 200)} ${['Marina', 'Broad St', 'Adeola Odeku', 'Victoria Island'][Math.floor(Math.random() * 4)]}, Lagos`,
        registrationDate: randomDate(8),
        contactEmail: `vendor${Math.floor(Math.random() * 9999)}@example.com`,
        phoneNumber: `080${Math.floor(10000000 + Math.random() * 89999999)}`,
        verificationStatus: 'unverified' as const,
    };

    if (!isFraud) return base;

    // Inject a fraud pattern
    const fraudType = Math.floor(Math.random() * 3);
    if (fraudType === 0) base.registrationDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // registered 5 days ago
    if (fraudType === 1) base.bankAccount = '1234567890';
    if (fraudType === 2) base.rcNumber = 'RC12';

    return base;
}

async function seed() {
    await mongoose.connect(env.MONGODB_URI);
    await VendorProfile.deleteMany({});

    const vendors = [
        ...Array.from({ length: 80 }, () => generateVendor(false)),
        ...Array.from({ length: 20 }, () => generateVendor(true)),
    ];

    await VendorProfile.insertMany(vendors);
    console.log(`Seeded ${vendors.length} vendors (80 clean, 20 fraudulent)`);
    await mongoose.disconnect();
}

seed().catch(console.error);