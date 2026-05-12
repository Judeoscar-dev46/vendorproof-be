import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
    ownerId: mongoose.Types.ObjectId;
    ownerType: 'individual' | 'institution';
    firstName: string;
    lastName: string;
    email: string;
    bvn: string;
    gender: string;
    address: string;
    bankCode: string;
    accountNumber: string;
    mobileNumber: string;
    settlementAccountNumber: string;
    customerId: string;
    balance: number;
    status: 'active' | 'inactive';
    recentFundings: {
        amount: number;
        fundedAt: Date;
        reference: string;
    }[];
}

const WalletSchema: Schema = new Schema<IWallet>({
    ownerId: { type: Schema.Types.ObjectId, required: true },
    ownerType: { type: String, enum: ['individual', 'institution'], required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    bvn: { type: String, required: true },
    address: { type: String, required: true },
    gender: { type: String, required: true },
    bankCode: { type: String, required: true },
    accountNumber: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    settlementAccountNumber: { type: String, required: false },
    customerId: { type: String, required: true },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    recentFundings: [{
        amount: { type: Number, required: true },
        fundedAt: { type: Date, default: Date.now },
        reference: { type: String, required: true },
    }],
}, { timestamps: true });

WalletSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });
WalletSchema.index({ accountNumber: 1 });

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
