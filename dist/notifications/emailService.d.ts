export declare function sendEmail(payload: {
    to: string;
    subject: string;
    html: string;
}): Promise<{
    success: boolean;
    data: import("resend").CreateEmailResponseSuccess;
    error?: never;
} | {
    success: boolean;
    error: unknown;
    data?: never;
}>;
//# sourceMappingURL=emailService.d.ts.map