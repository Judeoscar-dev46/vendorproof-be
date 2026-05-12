export declare function runVerification(vendorId: string, documentBase64: string, mediaType: 'image/jpeg' | 'image/png' | 'application/pdf', invoiceAmount?: number): Promise<import("mongoose").Document<unknown, {}, import("../../models/verification.model").IVerification, {}, import("mongoose").DefaultSchemaOptions> & import("../../models/verification.model").IVerification & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}>;
//# sourceMappingURL=verification.service.d.ts.map