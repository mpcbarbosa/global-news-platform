import { Request, Response, NextFunction } from 'express';
import { ingestionService } from '../services/ingestion.service';
import { WebhookPayload, IngestArticlePayload } from '../types';
import { sendSuccess } from '../utils/response';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';

export class WebhookController {
  async handleIngest(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body as WebhookPayload;

      if (payload.event !== 'article.ingest' && payload.event !== 'article.batch_ingest') {
        throw new AppError(`Unknown webhook event: ${payload.event}`, 400, 'BAD_REQUEST');
      }

      if (payload.event === 'article.ingest') {
        const data = payload.data as IngestArticlePayload;
        const result = await ingestionService.ingestArticle(data);
        sendSuccess(res, result, 'Article processed');
      } else {
        const data = payload.data as IngestArticlePayload[];
        if (!Array.isArray(data)) {
          throw new AppError('Batch ingest expects an array of articles', 400, 'BAD_REQUEST');
        }
        const result = await ingestionService.ingestBatch(data);
        sendSuccess(res, result, 'Batch processed');
      }
    } catch (error) {
      logger.error('Webhook processing error', { error: (error as Error).message });
      next(error);
    }
  }
}

export const webhookController = new WebhookController();
