import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail(payload: {
    to: string;
    subject: string;
    html: string;
}) {
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
    } catch (err) {
        console.error('[Resend Catch]:', err);
        return { success: false, error: err };
    }
}
