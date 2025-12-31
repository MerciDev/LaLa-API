import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const adminToken = process.env.ADMIN_TOKEN;

    // Safety check: Avoid locking out if token is not set
    if (!adminToken) {
        console.warn('⚠️  ADMIN_TOKEN is not set in .env. Denying all write access.');
        res.status(500).json({ error: 'Server configuration error' });
        return;
    }

    const token = req.headers['x-admin-token'];

    if (!token || token !== adminToken) {
        res.status(403).json({ error: 'Forbidden: Admin access only' });
        return;
    }

    next();
};
