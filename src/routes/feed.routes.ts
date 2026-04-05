import { Router, Request, Response, NextFunction } from 'express';
import { articleService } from '../services/article.service';
import { optionalAuth } from '../middlewares/auth.middleware';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/response';

const router = Router();

// Personalized feed — uses user's preferred language if authenticated
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { page, limit, category, country, source, search } = req.query;

    // Default language from user preferences or query
    const lang = (req.query.lang as string) || 'en';

    const result = await articleService.getArticles({
      page: page as string,
      limit: limit as string || '20',
      language: lang,
      category: category as string,
      country: country as string,
      source: source as string,
      search: search as string,
    });

    sendSuccess(res, result);
  } catch (error) { next(error); }
});

// Trending feed
router.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, lang } = req.query;
    const articles = await articleService.getTrending(Number(limit) || 20, lang as string);
    sendSuccess(res, articles);
  } catch (error) { next(error); }
});

export default router;
