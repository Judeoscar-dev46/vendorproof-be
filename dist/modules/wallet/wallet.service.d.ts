import { IWallet } from '../../models/wallet.model';
interface WalletData {
    ownerId: string;
    ownerType: 'individual' | 'institution';
    bvn?: string;
    address: string;
    gender: string;
    email?: string;
    accountNumber?: string;
}
export declare function createWallet(walletData: WalletData): Promise<IWallet>;
export declare function getWalletById(id: string): Promise<IWallet>;
export declare function getWalletByOwner(ownerId: string, ownerType: 'individual' | 'institution'): Promise<IWallet>;
export declare function creditWalletByVirtualAccount(virtualAccountNumber: string, settledAmountKobo: number, transactionReference: string, metadata: Record<string, unknown>): Promise<void>;
export declare function debitWallet(ownerId: string, ownerType: 'individual' | 'institution', amountNaira: number, transactionReference: string): Promise<void>;
export {};
//# sourceMappingURL=wallet.service.d.ts.map