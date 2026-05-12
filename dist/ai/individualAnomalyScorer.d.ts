import { IIndividualProfile } from '../models/individualProfile.model';
export interface IndividualAnomalyResult {
    score: number;
    flags: string[];
    penalties: {
        rule: string;
        penalty: number;
    }[];
}
export declare function scoreIndividualAnomaly(profile: IIndividualProfile, transactionAmount?: number): IndividualAnomalyResult;
//# sourceMappingURL=individualAnomalyScorer.d.ts.map