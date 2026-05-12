import { Request, Response, NextFunction } from 'express';
declare module 'express' {
    interface Request {
        file?: any;
    }
}
export declare function submitVerification(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getVerification(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=verification.controller.d.ts.map