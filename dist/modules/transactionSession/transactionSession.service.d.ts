import { ITransactionSession } from '../../models/transactionSession.model';
import { SupportedMediaType } from '../../ai/documentAnalyser';
export declare function createTransactionSession(initiatorProfileId: string, dto: {
    recipientPhone?: string;
    recipientEmail?: string;
    amount: number;
    description: string;
}): Promise<import("mongoose").Document<unknown, {}, ITransactionSession, {}, import("mongoose").DefaultSchemaOptions> & ITransactionSession & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}>;
export declare function joinTransactionSession(sessionCode: string, recipientProfileId: string): Promise<import("mongoose").Document<unknown, {}, ITransactionSession, {}, import("mongoose").DefaultSchemaOptions> & ITransactionSession & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}>;
export declare function submitSessionVerification(sessionCode: string, profileId: string, documentBase64: string, mediaType: SupportedMediaType): Promise<{
    yourScore: number;
    yourVerdict: import("../../ai/scoreAggregator").Verdict;
    sessionCode: string;
    status: import("../../models/transactionSession.model").SessionStatus | undefined;
}>;
export declare function giveSessionConsent(sessionCode: string, profileId: string): Promise<{
    consented: boolean;
    status: unknown;
}>;
export declare function getSessionStatus(sessionCode: string, profileId: string): Promise<{
    sessionCode: string;
    amount: number;
    description: string;
    status: import("../../models/transactionSession.model").SessionStatus;
    blockedReason: string | undefined;
    expiresAt: Date;
    initiatorScore: number | undefined;
    recipientScore: number | undefined;
    initiatorVerdict: "trusted" | "review" | "blocked" | undefined;
    recipientVerdict: "trusted" | "review" | "blocked" | undefined;
    yourConsent: boolean;
    theirConsent: boolean;
    squadTransactionRef: string | undefined;
}>;
//# sourceMappingURL=transactionSession.service.d.ts.map