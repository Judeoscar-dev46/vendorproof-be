export async function sendVerificationRequestNotification(payload: {
    recipientEmail?: string;
    recipientPhone?: string;
    requestCode: string;
    institutionName: string;
    paymentAmount: number;
    expiresAt: Date;
}) {
    const link = `${process.env.APP_URL}/verify/${payload.requestCode}`;
    const message = `${payload.institutionName} wants to pay you ₦${payload.paymentAmount.toLocaleString()}. Verify your business securely at VendorProof to receive payment. Link: ${link} (expires ${payload.expiresAt.toLocaleString()})`;

    if (payload.recipientPhone) {
        // await termii.sendSms(payload.recipientPhone, message);
        console.log(`[SMS] → ${payload.recipientPhone}: ${message}`);
    }

    if (payload.recipientEmail) {
        // await sendgrid.send({ to: payload.recipientEmail, subject: 'Payment verification request', text: message });
        console.log(`[EMAIL] → ${payload.recipientEmail}: ${message}`);
    }
}

export async function sendSessionInviteNotification(payload: {
    recipientPhone?: string;
    recipientEmail?: string;
    sessionCode: string;
    initiatorName: string;
    amount: number;
    description: string;
    expiresAt: Date;
}) {
    const link = `${process.env.APP_URL}/session/${payload.sessionCode}`;
    const message = `${payload.initiatorName} wants to send you ₦${payload.amount.toLocaleString()} for "${payload.description}". Both parties verify identity first. Join here: ${link} (expires in 2 hours)`;

    if (payload.recipientPhone) {
        console.log(`[SMS] → ${payload.recipientPhone}: ${message}`);
    }
    if (payload.recipientEmail) {
        console.log(`[EMAIL] → ${payload.recipientEmail}: ${message}`);
    }
}