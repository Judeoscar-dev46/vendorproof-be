import { SupportedMediaType } from './documentAnalyser';
export interface IdentityAnalysisResult {
    score: number;
    extractedName: string;
    extractedDob: string;
    extractedIdNumber: string;
    idType: 'NIN Slip' | 'Voter Card' | 'International Passport' | 'Driver Licence' | 'Unknown';
    nameMatchesClaimed: boolean;
    dobMatchesClaimed: boolean;
    documentExpired: boolean;
    documentReadable: boolean;
    flags: string[];
    reasoning: string;
}
export declare function analyseIdentityDocument(base64Document: string, mediaType: SupportedMediaType, claimedDetails: {
    fullName: string;
    dateOfBirth: string;
    bvn: string;
    ninNumber?: string;
}): Promise<IdentityAnalysisResult>;
//# sourceMappingURL=identityAnalyser.d.ts.map