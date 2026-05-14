"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    APP: zod_1.z.string().default("http://localhost:3000"),
    PORT: zod_1.z.string().default('3000'),
    MONGODB_URI: zod_1.z.string(),
    ANTHROPIC_API_KEY: zod_1.z.string(),
    SQUAD_SECRET_KEY: zod_1.z.string(),
    SQUAD_BASE_URL: zod_1.z.string().default('https://sandbox-api-d.squadco.com'),
    JWT_SECRET: zod_1.z.string(),
    ADMIN_SETUP_TOKEN: zod_1.z.string(),
    INVOFI_SECURE_TOKEN: zod_1.z.string(),
    SQUAD_MERCHANT_ID: zod_1.z.string(),
    ENCRYPTION_KEY: zod_1.z.string(),
    TERMII_BASE_URL: zod_1.z.string().default("https://v3.api.termii.com"),
    TERMII_API_KEY: zod_1.z.string(),
    TERMII_SECRET_KEY: zod_1.z.string(),
    RESEND_API_KEY: zod_1.z.string(),
    FACE_AI_SIDECAR_URL: zod_1.z.string().default('http://localhost:8000'),
});
exports.env = envSchema.parse(process.env);
//# sourceMappingURL=env.js.map