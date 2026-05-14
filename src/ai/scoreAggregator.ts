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
        faceScore?: number | undefined;
    };
    allFlags: string[];
    verdictSummary: string;
}

function deriveVerdict(score: number): Verdict {
    if (score >= 80) return 'trusted';
    if (score >= 50) return 'review';
    return 'blocked';
}

function buildVerdictSummary(
    score: number,
    verdict: Verdict,
    flags: string[],
    subScores: { documentScore: number; anomalyScore: number; networkScore: number; faceScore?: number | undefined },
    mode: 'vendor' | 'individual'
): string {
    if (verdict === 'trusted') {
        return `This ${mode === 'vendor' ? 'vendor' : 'individual'} has been verified and is trusted (score: ${score}/100). No significant risk flags were raised. Payment may proceed.`;
    }

    const flagSummary = flags.length > 0
        ? ` Key concerns: ${flags.slice(0, 3).join('; ')}${flags.length > 3 ? ` and ${flags.length - 3} more` : ''}.`
        : '';

    const sortedEntries = Object.entries(subScores)
        .filter(([, val]) => val !== undefined)
        .sort(([, a], [, b]) => (a as number) - (b as number));
    const weakestArea = (sortedEntries[0]?.[0] ?? 'analysis')
        .replace('Score', '')
        .replace('document', 'document analysis')
        .replace('anomaly', 'anomaly detection')
        .replace('network', 'network analysis')
        .replace('face', 'facial recognition');

    if (verdict === 'review') {
        return `This ${mode === 'vendor' ? 'vendor' : 'individual'} requires manual review (score: ${score}/100). The weakest signal came from ${weakestArea}.${flagSummary} A compliance officer should review before approving payment.`;
    }

    return `This ${mode === 'vendor' ? 'vendor' : 'individual'} has been blocked (score: ${score}/100). The ${weakestArea} module raised the most significant concerns.${flagSummary} Payment must not proceed without escalation.`;
}

const VENDOR_WEIGHTS = {
    document: 0.40,
    anomaly: 0.35,
    network: 0.25,
};

export function aggregateScores(
    doc: DocumentAnalysisResult,
    anomaly: AnomalyResult,
    network: NetworkResult
): AggregatedScore {

    const trustScore = Math.round(
        doc.score * VENDOR_WEIGHTS.document +
        anomaly.score * VENDOR_WEIGHTS.anomaly +
        network.score * VENDOR_WEIGHTS.network
    );

    const verdict = deriveVerdict(trustScore);
    const allFlags = [...doc.flags, ...anomaly.flags, ...network.flags];

    const subScores = {
        documentScore: doc.score,
        anomalyScore: anomaly.score,
        networkScore: network.score,
    };

    return {
        trustScore,
        verdict,
        subScores,
        allFlags,
        verdictSummary: buildVerdictSummary(trustScore, verdict, allFlags, subScores, 'vendor'),
    };
}

const INDIVIDUAL_WEIGHTS = {
    identity: 0.40,
    face: 0.25,
    anomaly: 0.20,
    network: 0.15,
};

export function aggregateIndividualScores(
    identity: IdentityAnalysisResult,
    anomaly: IndividualAnomalyResult,
    network: NetworkResult,
    face?: { score: number; match: boolean; verdict: string; detail: string }
): AggregatedScore {

    const faceScore = face?.score ?? 100; // default to 100 if no face data provided (fallback)

    const rawScore = Math.round(
        identity.score * INDIVIDUAL_WEIGHTS.identity +
        faceScore * INDIVIDUAL_WEIGHTS.face +
        anomaly.score * INDIVIDUAL_WEIGHTS.anomaly +
        network.score * INDIVIDUAL_WEIGHTS.network
    );

    let trustScore = rawScore;

    if (!identity.documentReadable) {
        trustScore = Math.min(trustScore, 20);
    }

    if (identity.documentExpired) {
        trustScore = Math.min(trustScore, 30);
    }

    if (!identity.nameMatchesClaimed && !identity.dobMatchesClaimed) {
        trustScore = Math.min(trustScore, 25);
    }

    if (face && !face.match) {
        // If face match fails significantly, cap the trust score
        trustScore = Math.min(trustScore, face.verdict === 'mismatch' ? 20 : 45);
    }

    const verdict = deriveVerdict(trustScore);
    const allFlags = [...identity.flags, ...anomaly.flags, ...network.flags];

    const subScores = {
        documentScore: identity.score,
        anomalyScore: anomaly.score,
        networkScore: network.score,
        faceScore: face?.score,
    };

    if (trustScore < rawScore) {
        allFlags.unshift(
            `Trust score reduced from ${rawScore} to ${trustScore} due to a hard override condition`
        );
    }

    return {
        trustScore,
        verdict,
        subScores,
        allFlags,
        verdictSummary: buildVerdictSummary(trustScore, verdict, allFlags, subScores, 'individual'),
    };
}