import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
    APP: z.string().default("http://localhost:3000"),
    PORT: z.string().default('3000'),
    MONGODB_URI: z.string(),
    ANTHROPIC_API_KEY: z.string(),
    SQUAD_SECRET_KEY: z.string(),
    SQUAD_BASE_URL: z.string().default('https://sandbox-api-d.squadco.com'),
    JWT_SECRET: z.string(),
    ADMIN_SETUP_TOKEN: z.string(),
    INVOFI_SECURE_TOKEN: z.string(),
    SQUAD_MERCHANT_ID: z.string(),
    ENCRYPTION_KEY: z.string(),
    TERMII_BASE_URL: z.string().default("https://v3.api.termii.com"),
    TERMII_API_KEY: z.string(),
    TERMII_SECRET_KEY: z.string(),
    RESEND_API_KEY: z.string(),
    FACE_AI_SIDECAR_URL: z.string().default('http://localhost:8000'),
});

export const env = envSchema.parse(process.env);
