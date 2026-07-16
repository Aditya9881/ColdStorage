import { Request, Response, NextFunction } from 'express';

/**
 * HTTPS Enforcement Middleware (Production only)
 *
 * Redirects HTTP → HTTPS and sets HSTS header.
 * Works behind reverse proxies (Nginx, ALB, Cloudflare) that set x-forwarded-proto.
 */
export function enforceHttps(req: Request, res: Response, next: NextFunction): void {
  // Trust the x-forwarded-proto header from reverse proxies
  const proto = req.headers['x-forwarded-proto'] || req.protocol;

  if (proto !== 'https') {
    const httpsUrl = `https://${req.hostname}${req.originalUrl}`;
    res.redirect(301, httpsUrl);
    return;
  }

  // Set HSTS header — browser remembers to use HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
}
