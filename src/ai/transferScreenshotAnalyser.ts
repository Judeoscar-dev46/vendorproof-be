import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface ScreenshotAnalysisResult {
    authenticityScore: number;
    verdict: 'likely_genuine' | 'suspicious' | 'likely_fabricated';
    bank: string;
    extractedAmount: number | null;
    extractedReference: string | null;
    extractedDate: string | null;
    amountMatchesClaim: boolean | null;
    flags: string[];
    reasoning: string;
    recommendation: string;
}

export async function analyseTransferScreenshot(
    base64Screenshot: string,
    mediaType: 'image/jpeg' | 'image/png',
    claimedDetails: {
        amount: number;
        senderName?: string | undefined;
        date?: string | undefined;
    }
): Promise<ScreenshotAnalysisResult> {

    const currentDate = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'full', timeStyle: 'short' });

    const prompt = `You are a payment fraud detection specialist analysing a Nigerian bank transfer screenshot.
Today is ${currentDate}.

The person claims this screenshot shows a transfer of ₦${claimedDetails.amount.toLocaleString()}.
${claimedDetails.senderName ? `Claimed sender: ${claimedDetails.senderName}` : ''}
${claimedDetails.date ? `Claimed date: ${claimedDetails.date}` : ''}

Analyse the screenshot for signs of fabrication or editing. Pay close attention to these specific bank patterns:

1. **OPay Receipts**:
   - Header: Green/Teal circle logo, "Transaction Receipt" title.
   - Date Format: Typically "Month DDth, YYYY HH:MM:SS" (e.g., May 14th, 2026 00:32:26).
   - Amount: Large, Green, with Naira symbol (₦).
   - Fields: Recipient Details, Sender Details, Transaction Type, Transaction No, Session ID.
   - Footer: Marketing text about OPay licensed by CBN and a row of black circles at the very bottom.

2. **GTCO (Guaranty Trust) Receipts**:
   - Header: Bold "Receipt" text, "GTCO" orange square logo on the top right.
   - Date Format: "DD Month YYYY HH:MM, GMT+1".
   - Amount: Large, bold, with Naira symbol, followed by amount in words below it.
   - UI: Includes a large QR code and "Download the new GTWorld app" call to action.

General Red Flags:
- Font inconsistencies: Mismatched weights, sizes, or families.
- Pixel anomalies: Jagged edges or compression artefacts around numbers/names.
- Alignment: Text that is slightly tilted or misaligned with surrounding lines.
- Logical Errors: Dates in the future relative to ${currentDate}, or transaction numbers that don't match the bank's format.

Return ONLY a JSON object:
{
  "authenticityScore": <0-100, 100 = appears genuine>,
  "verdict": "<likely_genuine | suspicious | likely_fabricated>",
  "bank": "<detected bank name or Unknown>",
  "extractedAmount": <number or null>,
  "extractedReference": "<reference number or null>",
  "extractedDate": "<date string or null>",
  "amountMatchesClaim": <true/false/null>,
  "flags": ["<specific visual or logical anomalies found>"],
  "reasoning": "<2-3 sentence explanation addressing why you reached this verdict, especially checking the date against today's date>",
  "recommendation": "<what the recipient should do>"
}`;

    const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'image',
                    source: { type: 'base64', media_type: mediaType, data: base64Screenshot }
                },
                { type: 'text', text: prompt }
            ]
        }]
    });

    const text = response?.content?.[0]?.type === 'text' ? response.content?.[0].text : '';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
}