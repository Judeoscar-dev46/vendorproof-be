import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

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

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Missing or malformed Authorization header. Expected: Bearer <token>',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token as string, env.JWT_SECRET) as unknown as JwtPayload;
        req.user = decoded;
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                error: 'Token has expired. Please log in again.',
            });
        }

        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token.',
            });
        }

        next(err);
    }
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token as string, env.JWT_SECRET) as unknown as JwtPayload;
            req.user = decoded;
        } catch (err) {
            // Ignore token errors for optional auth
        }
    }
    next();
}

export function requireRole(...roles: JwtPayload['role'][]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
            });
        }

        next();
    };
}

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });
}