import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface DocumentAnalysisResult {
    score: number;
    extractedName: string;
    extractedRcNumber: string;
    nameMatch: boolean;
    rcMatch: boolean;
    documentType: string;
    flags: string[];
    reasoning: string;
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
type DocumentMediaType = 'application/pdf';
export type SupportedMediaType = ImageMediaType | DocumentMediaType;

export async function analyseDocument(
    base64Document: string,
    mediaType: SupportedMediaType,
    vendorMetadata: { companyName: string; rcNumber: string; registrationDate: string }
): Promise<DocumentAnalysisResult> {

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
  "reasoning": "<2-3 sentence explanation of your score. IMPORTANT: To protect privacy, do not include specific PII such as full BVNs, RC Numbers, or direct name/date values. Use generic terms like 'identity record discrepancy' or 'registration detail mismatch' so this can be safely shared with institutions.>"
}`;

    const documentContent: Anthropic.MessageParam['content'] =
        mediaType === 'application/pdf'
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
    return JSON.parse(cleaned) as DocumentAnalysisResult;
}