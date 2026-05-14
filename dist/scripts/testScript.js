"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const vendorProfile_model_1 = require("../models/vendorProfile.model");
const env_1 = require("../config/env");
const crypto_1 = require("../utils/crypto");
const nigerianBanks = [
    { code: '044', name: 'Access Bank' },
    { code: '058', name: 'GTBank' },
    { code: '011', name: 'First Bank' },
    { code: '057', name: 'Zenith Bank' },
];
function randomDate(yearsBack) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - Math.random() * yearsBack);
    return d;
}
function generateVendor(isFraud = false) {
    const bank = nigerianBanks[Math.floor(Math.random() * nigerianBanks.length)];
    const base = {
        companyName: `${['Alpha', 'Beta', 'Delta', 'Omega'][Math.floor(Math.random() * 4)]} ${['Solutions', 'Ventures', 'Services', 'Enterprises'][Math.floor(Math.random() * 4)]} Ltd`,
        rcNumber: `RC${Math.floor(100000 + Math.random() * 899999)}`,
        directorBvn: (0, crypto_1.encrypt)(`${Math.floor(10000000000 + Math.random() * 89999999999)}`),
        bankAccount: `${Math.floor(1000000000 + Math.random() * 8999999999)}`,
        bankCode: bank?.code,
        address: `${Math.floor(1 + Math.random() * 200)} ${['Marina', 'Broad St', 'Adeola Odeku', 'Victoria Island'][Math.floor(Math.random() * 4)]}, Lagos`,
        registrationDate: randomDate(8),
        contactEmail: `vendor${Math.floor(Math.random() * 9999)}@example.com`,
        phoneNumber: `080${Math.floor(10000000 + Math.random() * 89999999)}`,
        verificationStatus: 'unverified',
    };
    if (!isFraud)
        return base;
    // Inject a fraud pattern
    const fraudType = Math.floor(Math.random() * 3);
    if (fraudType === 0)
        base.registrationDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // registered 5 days ago
    if (fraudType === 1)
        base.bankAccount = '1234567890';
    if (fraudType === 2)
        base.rcNumber = 'RC12';
    return base;
}
async function seed() {
    await mongoose_1.default.connect(env_1.env.MONGODB_URI);
    await vendorProfile_model_1.VendorProfile.deleteMany({});
    const vendors = [
        ...Array.from({ length: 80 }, () => generateVendor(false)),
        ...Array.from({ length: 20 }, () => generateVendor(true)),
    ];
    await vendorProfile_model_1.VendorProfile.insertMany(vendors);
    console.log(`Seeded ${vendors.length} vendors (80 clean, 20 fraudulent)`);
    await mongoose_1.default.disconnect();
}
seed().catch(console.error);
//# sourceMappingURL=testScript.js.map