"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const resend_1 = require("resend");
const env_1 = require("../config/env");
const resend = new resend_1.Resend(env_1.env.RESEND_API_KEY);
async function sendEmail(payload) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'VendorProof <notifications@invofi.com.ng>',
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
        });
        if (error) {
            console.error('[Resend Error]:', error);
            return { success: false, error };
        }
        return { success: true, data };
    }
    catch (err) {
        console.error('[Resend Catch]:', err);
        return { success: false, error: err };
    }
}
//# sourceMappingURL=emailService.js.map