"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationRequestNotification = sendVerificationRequestNotification;
exports.sendSessionInviteNotification = sendSessionInviteNotification;
const emailService_1 = require("./emailService");
const termiiService_1 = require("./termiiService");
const env_1 = require("../config/env");
async function sendVerificationRequestNotification(payload) {
    const link = `${env_1.env.APP}/verify/${payload.requestCode}`;
    const message = `${payload.institutionName} wants to pay you ₦${payload.paymentAmount.toLocaleString()}. Verify your business securely at VendorProof to receive payment. Link: ${link} (expires ${payload.expiresAt.toLocaleString()})`;
    if (payload.recipientPhone) {
        await (0, termiiService_1.sendSms)(payload.recipientPhone, message);
    }
    if (payload.recipientEmail) {
        await (0, emailService_1.sendEmail)({
            to: payload.recipientEmail,
            subject: 'Payment Verification Request - VendorProof',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">Action Required: Business Verification</h2>
                    <p>${payload.institutionName} wants to pay you <strong>₦${payload.paymentAmount.toLocaleString()}</strong>.</p>
                    <p>To receive this payment, you need to verify your business securely on VendorProof.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${link}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Business Now</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link will expire on ${payload.expiresAt.toLocaleString()}.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">Sent by VendorProof. If you weren't expecting this, you can safely ignore this email.</p>
                </div>
            `
        });
    }
}
async function sendSessionInviteNotification(payload) {
    const link = `${env_1.env.APP}/session/${payload.sessionCode}`;
    const message = `${payload.initiatorName} wants to send you ₦${payload.amount.toLocaleString()} for "${payload.description}". Both parties verify identity first. Join here: ${link} (expires in 2 hours)`;
    if (payload.recipientPhone) {
        await (0, termiiService_1.sendSms)(payload.recipientPhone, message);
    }
    if (payload.recipientEmail) {
        await (0, emailService_1.sendEmail)({
            to: payload.recipientEmail,
            subject: 'Secure Payment Session Invitation - VendorProof',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">Secure Payment Invitation</h2>
                    <p><strong>${payload.initiatorName}</strong> has invited you to a secure payment session for "<strong>${payload.description}</strong>".</p>
                    <p>Amount: <strong>₦${payload.amount.toLocaleString()}</strong></p>
                    <p>Both parties must verify their identity before the payment can proceed.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${link}" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Secure Session</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This invitation expires in 2 hours.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">Sent by VendorProof. Secured by Invofi.</p>
                </div>
            `
        });
    }
}
//# sourceMappingURL=notificationService.js.map