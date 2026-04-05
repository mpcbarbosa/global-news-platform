import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { hmacSha256, timingSafeEqual } from '../utils/hash';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../config/logger';

export function verifyWebhookSignature(req: Request, _res: Response, next: NextFunction): void {
  const signature = req.headers['x-webhook-signature'] as string | undefined;
  const timestamp = req.headers['x-webhook-timestamp'] as string | undefined;

  if (!signature || !timestamp) {
    return next(new UnauthorizedError('Missing webhook signature or timestamp'));
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10) * 1000;
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    logger.warn('Webhook timestamp too old', { timestamp, diff: Math.abs(now - requestTime) });
    return next(new UnauthorizedError('Webhook timestamp expired'));
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const payload = `${timestamp}.${body}`;
  const expectedSignature = hmacSha256(payload, env.WEBHOOK_SECRET);

  try {
    if (!timingSafeEqual(signature, expectedSignature)) {
      logger.warn('Invalid webhook signature');
      return next(new UnauthorizedError('Invalid webhook signature'));
    }
  } catch {
    return next(new UnauthorizedError('Invalid webhook signature format'));
  }

  next();
}
