import { DocumentAnalysisResult } from './documentAnalyser';
import { IdentityAnalysisResult } from './identityAnalyser';
import { AnomalyResult } from './anomalyScorer';
import { IndividualAnomalyResult } from './individualAnomalyScorer';
import { NetworkResult } from './networkAnalyser';
export type Verdict = 'trusted' | 'review' | 'blocked';
export interface AggregatedScore {
    trustScore: number;
    verdict: Verdict;
    subScores: {
        documentScore: number;
        anomalyScore: number;
        networkScore: number;
    };
    allFlags: string[];
    verdictSummary: string;
}
export declare function aggregateScores(doc: DocumentAnalysisResult, anomaly: AnomalyResult, network: NetworkResult): AggregatedScore;
export declare function aggregateIndividualScores(identity: IdentityAnalysisResult, anomaly: IndividualAnomalyResult, network: NetworkResult): AggregatedScore;
//# sourceMappingURL=scoreAggregator.d.ts.map