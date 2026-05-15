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
export declare function analyseTransferScreenshot(base64Screenshot: string, mediaType: 'image/jpeg' | 'image/png', claimedDetails: {
    amount: number;
    senderName?: string | undefined;
    date?: string | undefined;
}): Promise<ScreenshotAnalysisResult>;
//# sourceMappingURL=transferScreenshotAnalyser.d.ts.map