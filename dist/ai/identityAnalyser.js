"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyseIdentityDocument = analyseIdentityDocument;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const env_1 = require("../config/env");
const client = new sdk_1.default({ apiKey: env_1.env.ANTHROPIC_API_KEY });
function buildContentBlock(base64Document, mediaType, prompt) {
    if (mediaType === 'application/pdf') {
        return [
            {
                type: 'document',
                source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64Document,
                },
            },
            { type: 'text', text: prompt },
        ];
    }
    return [
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
}
async function analyseIdentityDocument(base64Document, mediaType, claimedDetails) {
    const prompt = `You are an identity fraud detection specialist reviewing a Nigerian government-issued identity document.

The person claims the following details:
- Full name: ${claimedDetails.fullName}
- Date of birth: ${claimedDetails.dateOfBirth}
- BVN: ${claimedDetails.bvn}
${claimedDetails.ninNumber ? `- NIN: ${claimedDetails.ninNumber}` : ''}

Your job is to carefully analyse the attached identity document and verify whether it is authentic and consistent with the claimed details.

Accepted document types are:
- NIN Slip (National Identity Number slip issued by NIMC)
- Voter Card (Permanent Voter Card issued by INEC)
- International Passport (Nigerian passport)
- Driver Licence (issued by FRSC)

Score guidelines:
- 90–100: Document is authentic, all details match, no anomalies
- 75–89: Document appears genuine, minor inconsistencies in non-critical fields
- 50–74: Notable mismatches or suspicious elements — possible genuine document with wrong person
- 25–49: Multiple red flags, likely tampered or belonging to someone else
- 0–24: Clear forgery signals, critical field alterations, or document is unreadable

Specific things to check:
1. Is the document clearly readable and complete (not cropped, blurred, or obscured)?
2. Does the name on the document match the claimed name? (allow for middle name omission)
3. Does the date of birth on the document match the claimed date of birth?
4. If it is a NIN slip, does the NIN number match the claimed NIN (if provided)?
5. Are there signs of digital manipulation — inconsistent fonts, misaligned text, unusual pixelation around key fields?
6. Is the document expired?
7. Are security features consistent with genuine Nigerian government IDs of this type?

Return ONLY a valid JSON object with no additional text, preamble, or markdown formatting:
{
  "score": <integer 0-100>,
  "extractedName": "<full name exactly as it appears on the document>",
  "extractedDob": "<date of birth in YYYY-MM-DD format, or empty string if unreadable>",
  "extractedIdNumber": "<the ID number, NIN, passport number, or licence number as it appears>",
  "idType": "<NIN Slip | Voter Card | International Passport | Driver Licence | Unknown>",
  "nameMatchesClaimed": <true or false>,
  "dobMatchesClaimed": <true or false>,
  "documentExpired": <true or false>,
  "documentReadable": <true or false — false if image quality is too poor to verify>,
  "flags": [
    "<each flag is a specific, plain-language observation, e.g. 'Font inconsistency detected on date of birth field'>"
  ],
  "reasoning": "<2-3 sentences summarising your confidence. IMPORTANT: To protect privacy, do not include specific PII such as full BVNs, ID numbers, or direct name/date values. Use generic descriptions like 'discrepancy in identity details' or 'identification record mismatch' so this summary is safe for institutional review.>"
}`;
    const content = buildContentBlock(base64Document, mediaType, prompt);
    const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content }],
    });
    const rawText = response?.content?.[0]?.type === 'text'
        ? response.content[0].text
        : '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    }
    catch {
        parsed = {
            score: 0,
            extractedName: '',
            extractedDob: '',
            extractedIdNumber: '',
            idType: 'Unknown',
            nameMatchesClaimed: false,
            dobMatchesClaimed: false,
            documentExpired: false,
            documentReadable: false,
            flags: ['Document could not be parsed — image may be unreadable or unsupported format'],
            reasoning: 'The document analysis pipeline could not extract structured data from this submission.',
        };
    }
    if (!parsed.documentReadable) {
        parsed.score = Math.min(parsed.score, 10);
        if (!parsed.flags.some(f => f.toLowerCase().includes('unreadable'))) {
            parsed.flags.push('Document image quality is too poor to verify — resubmission required');
        }
    }
    if (parsed.documentExpired) {
        parsed.score = Math.min(parsed.score, 30);
        if (!parsed.flags.some(f => f.toLowerCase().includes('expired'))) {
            parsed.flags.push('Identity document is expired');
        }
    }
    return parsed;
}
//# sourceMappingURL=identityAnalyser.js.map