import { Request, Response, NextFunction } from 'express';
export interface JwtPayload {
    userId: string;
    email: string;
    role: 'admin' | 'officer' | 'viewer' | 'individual' | 'institution' | 'vendor';
}
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
export declare function authenticate(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: JwtPayload['role'][]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function signToken(payload: JwtPayload): string;
//# sourceMappingURL=auth.d.ts.map