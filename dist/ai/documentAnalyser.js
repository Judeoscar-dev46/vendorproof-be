"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyseDocument = analyseDocument;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const env_1 = require("../config/env");
const client = new sdk_1.default({ apiKey: env_1.env.ANTHROPIC_API_KEY });
async function analyseDocument(base64Document, mediaType, vendorMetadata) {
    const prompt = `You are a fraud detection specialist reviewing a business registration document for a Nigerian vendor.

Vendor's claimed details:
- Company name: ${vendorMetadata.companyName}
- Registration Number (RC, BN, IT, LLP, or LP): ${vendorMetadata.rcNumber}
- Registration date: ${vendorMetadata.registrationDate}

Analyse the attached document and return ONLY a JSON object with this exact structure:
{
  "score": <0-100, where 100 = fully authentic and consistent>,
  "extractedName": "<company name as it appears in the document>",
  "extractedRcNumber": "<Registration number as it appears in the document (including prefix like RC, BN, IT, etc.)>",
  "nameMatch": <true/false>,
  "rcMatch": <true/false>,
  "documentType": "<e.g. CAC Certificate, Tax Clearance, Contract>",
  "flags": ["<any anomalies found>"],
  "reasoning": "<2-3 sentence explanation of your score>"
}`;
    const documentContent = mediaType === 'application/pdf'
        ? [
            {
                type: 'document',
                source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64Document,
                },
            },
            { type: 'text', text: prompt },
        ]
        : [
            {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Document,
                },
            },
            { type: 'text', text: prompt },
        ];
    const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: documentContent }],
    });
    const text = response?.content?.[0]?.type === 'text' ? response.content?.[0].text : '';
    const cleaned = text?.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
}
//# sourceMappingURL=documentAnalyser.js.map