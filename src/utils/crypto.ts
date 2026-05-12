import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(env.ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(hash: string): string {
    if (!hash || !hash.includes(':')) {
        return hash;
    }

    const [ivHex, encryptedText] = hash.split(':');
    if (!ivHex || !encryptedText) throw new Error('Invalid encrypted format');

    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(env.ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
