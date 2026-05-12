export interface InitiatePaymentDTO {
    verificationId: string;
    amount?: number | undefined;
    narration?: string | undefined;
}
export interface PaymentResult {
    transactionRef: string;
    amount: number;
    status: string;
    vendorName: string;
    trustScore: number;
    squadResponse: Record<string, unknown>;
}
export declare function initiatePayment(dto: InitiatePaymentDTO): Promise<PaymentResult>;
export declare function getPaymentStatus(verificationId: string): Promise<{
    paymentReleased: boolean;
    message: string;
    verification: {
        id: import("mongoose").Types.ObjectId;
        verdict: "trusted" | "review" | "blocked";
        trustScore: number;
    };
    transactionRef?: never;
    trustScore?: never;
    vendor?: never;
    squadStatus?: never;
} | {
    paymentReleased: boolean;
    transactionRef: string;
    trustScore: number;
    vendor: import("mongoose").Types.ObjectId | undefined;
    squadStatus: Record<string, unknown>;
    message?: never;
    verification?: never;
}>;
export declare function getVendorPayments(vendorId: string): Promise<{
    vendor: {
        id: import("mongoose").Types.ObjectId;
        companyName: string;
        rcNumber: string;
        status: "trusted" | "review" | "blocked" | "unverified" | "pending";
    };
    totalPayments: number;
    payments: (import("mongoose").Document<unknown, {}, import("../../models/verification.model").IVerification, {}, import("mongoose").DefaultSchemaOptions> & import("../../models/verification.model").IVerification & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[];
}>;
export declare function lookupAccount(bankCode: string, accountNumber: string): Promise<{
    account_number: string;
    account_name: string;
    bank_code: string;
}>;
export declare function fundTransfer(dto: {
    transactionReference: string;
    amount: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    remark: string;
}): Promise<Record<string, unknown>>;
export declare function processWebhook(payload: Record<string, unknown>, signature: string): Promise<void>;
//# sourceMappingURL=payment.service.d.ts.map