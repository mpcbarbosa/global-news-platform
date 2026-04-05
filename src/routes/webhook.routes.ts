import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { verifyWebhookSignature } from '../middlewares/webhook.middleware';

const router = Router();

router.post('/ingest', verifyWebhookSignature, (req, res, next) => webhookController.handleIngest(req, res, next));

export default router;
