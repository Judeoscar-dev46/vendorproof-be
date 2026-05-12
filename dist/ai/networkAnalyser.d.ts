export interface NetworkResult {
    score: number;
    flags: string[];
}
export declare function analyseNetwork(subjectId: string, bankAccount: string, bvnOrDirBvn: string, address: string, subjectType?: 'vendor' | 'individual'): Promise<NetworkResult>;
//# sourceMappingURL=networkAnalyser.d.ts.map