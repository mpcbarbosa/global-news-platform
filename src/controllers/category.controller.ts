import { Request, Response, NextFunction } from 'express';
import { categoryRepository } from '../repositories/category.repository';
import { cacheGet, cacheSet } from '../config/redis';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

export class CategoryController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = (req.query.lang as string) || 'en';
      const cacheKey = `categories:${lang}`;
      const cached = await cacheGet<Record<string, unknown>[]>(cacheKey);
      if (cached) return sendSuccess(res, cached);

      const categories = await categoryRepository.findAll(lang);
      await cacheSet(cacheKey, categories, 600);
      sendSuccess(res, categories);
    } catch (error) { next(error); }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryRepository.findBySlug(req.params.slug);
      if (!category) throw new NotFoundError('Category');
      sendSuccess(res, category);
    } catch (error) { next(error); }
  }
}

export const categoryController = new CategoryController();
