import { Request, Response, NextFunction } from 'express';
import { articleService } from '../services/article.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

export class ArticleController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, lang, category, country, source, search } = req.query;
      const result = await articleService.getArticles({
        page: page as string,
        limit: limit as string,
        language: lang as string,
        category: category as string,
        country: country as string,
        source: source as string,
        search: search as string,
      });
      sendSuccess(res, result);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { lang } = req.query;
      const article = await articleService.getArticleById(req.params.id, lang as string);
      sendSuccess(res, article);
    } catch (error) { next(error); }
  }

  async trending(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, lang } = req.query;
      const articles = await articleService.getTrending(Number(limit) || 10, lang as string);
      sendSuccess(res, articles);
    } catch (error) { next(error); }
  }

  async save(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await articleService.saveArticle(req.user!.userId, req.params.id);
      sendCreated(res, null, 'Article saved');
    } catch (error) { next(error); }
  }

  async unsave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await articleService.unsaveArticle(req.user!.userId, req.params.id);
      sendNoContent(res);
    } catch (error) { next(error); }
  }

  async savedList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, lang } = req.query;
      const result = await articleService.getSavedArticles(req.user!.userId, page as string, limit as string, lang as string);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  }

  async react(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reaction_type } = req.body;
      await articleService.addReaction(req.user!.userId, req.params.id, reaction_type);
      sendSuccess(res, null, 'Reaction added');
    } catch (error) { next(error); }
  }

  async unreact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await articleService.removeReaction(req.user!.userId, req.params.id);
      sendNoContent(res);
    } catch (error) { next(error); }
  }

  async comment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { content, parent_id } = req.body;
      const comment = await articleService.addComment(req.user!.userId, req.params.id, content, parent_id);
      sendCreated(res, comment);
    } catch (error) { next(error); }
  }

  async listComments(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      const result = await articleService.getComments(req.params.id, page as string, limit as string);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  }

  async share(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { platform } = req.body;
      await articleService.shareArticle(req.user!.userId, req.params.id, platform);
      sendSuccess(res, null, 'Share recorded');
    } catch (error) { next(error); }
  }
}

export const articleController = new ArticleController();
