export declare function sendVerificationRequestNotification(payload: {
    recipientEmail?: string;
    recipientPhone?: string;
    requestCode: string;
    institutionName: string;
    paymentAmount: number;
    expiresAt: Date;
}): Promise<void>;
export declare function sendSessionInviteNotification(payload: {
    recipientPhone?: string;
    recipientEmail?: string;
    sessionCode: string;
    initiatorName: string;
    amount: number;
    description: string;
    expiresAt: Date;
}): Promise<void>;
//# sourceMappingURL=notificationService.d.ts.map