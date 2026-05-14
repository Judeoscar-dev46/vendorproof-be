import axios from 'axios';
import { env } from '../config/env';

export async function sendSms(to: string, message: string) {
    try {
        let formattedTo = to.trim().replace(/\s+/g, '');
        if (formattedTo.startsWith('0')) {
            formattedTo = '234' + formattedTo.slice(1);
        } else if (formattedTo.startsWith('+')) {
            formattedTo = formattedTo.slice(1);
        }

        const data = {
            to: formattedTo,
            from: "Vendorproof",
            sms: message,
            type: "plain",
            api_key: env.TERMII_API_KEY,
            channel: "generic",
        };

        const response = await axios.post(`${env.TERMII_BASE_URL}/api/sms/send`, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (err: any) {
        console.error('[Termii] SMS failed:', err.response?.data || err.message);
        return null;
    }
}
