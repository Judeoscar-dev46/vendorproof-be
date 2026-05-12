import mongoose, { Document } from 'mongoose';
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
export declare const Wallet: mongoose.Model<IWallet, {}, {}, {}, mongoose.Document<unknown, {}, IWallet, {}, mongoose.DefaultSchemaOptions> & IWallet & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWallet>;
//# sourceMappingURL=wallet.model.d.ts.map