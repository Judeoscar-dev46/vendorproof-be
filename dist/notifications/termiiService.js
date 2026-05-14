"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = sendSms;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
async function sendSms(to, message) {
    try {
        let formattedTo = to.trim().replace(/\s+/g, '');
        if (formattedTo.startsWith('0')) {
            formattedTo = '234' + formattedTo.slice(1);
        }
        else if (formattedTo.startsWith('+')) {
            formattedTo = formattedTo.slice(1);
        }
        const data = {
            to: formattedTo,
            from: "Vendorproof",
            sms: message,
            type: "plain",
            api_key: env_1.env.TERMII_API_KEY,
            channel: "generic",
        };
        const response = await axios_1.default.post(`${env_1.env.TERMII_BASE_URL}/api/sms/send`, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (err) {
        console.error('[Termii] SMS failed:', err.response?.data || err.message);
        return null;
    }
}
//# sourceMappingURL=termiiService.js.map