export interface FaceMatchResult {
    match: boolean;
    score: number;
    verdict: 'matched' | 'review' | 'mismatch' | 'unclear';
    detail: string;
}
export declare function matchFace(idBase64: string, selfieBase64: string): Promise<FaceMatchResult>;
//# sourceMappingURL=faceAnalyser.d.ts.map