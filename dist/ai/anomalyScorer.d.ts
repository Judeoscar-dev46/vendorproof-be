export interface AnomalyResult {
    score: number;
    flags: string[];
    penalties: {
        rule: string;
        penalty: number;
    }[];
}
interface VendorLike {
    rcNumber: string;
    registrationDate: Date;
    directorBvn: string;
}
export declare function scoreAnomaly(vendor: VendorLike, invoiceAmount?: number): AnomalyResult;
export {};
//# sourceMappingURL=anomalyScorer.d.ts.map