"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const key = crypto_1.default.scryptSync(env_1.env.ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}
function decrypt(hash) {
    if (!hash || !hash.includes(':')) {
        return hash;
    }
    const [ivHex, encryptedText] = hash.split(':');
    if (!ivHex || !encryptedText)
        throw new Error('Invalid encrypted format');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto_1.default.scryptSync(env_1.env.ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
//# sourceMappingURL=crypto.js.map