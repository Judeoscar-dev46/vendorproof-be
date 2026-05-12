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
export declare function analyseDocument(base64Document: string, mediaType: SupportedMediaType, vendorMetadata: {
    companyName: string;
    rcNumber: string;
    registrationDate: string;
}): Promise<DocumentAnalysisResult>;
export {};
//# sourceMappingURL=documentAnalyser.d.ts.map