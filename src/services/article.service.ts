import { articleRepository } from '../repositories/article.repository';
import { cacheGet, cacheSet, cacheDelete } from '../config/redis';
import { parsePagination, paginate } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

export class ArticleService {
  async getArticles(params: {
    page?: string | number;
    limit?: string | number;
    language?: string;
    category?: string;
    country?: string;
    source?: string;
    search?: string;
  }) {
    const pagination = parsePagination(params.page, params.limit);
    const cacheKey = `articles:${JSON.stringify({ ...params, ...pagination })}`;

    const cached = await cacheGet<ReturnType<typeof paginate>>(cacheKey);
    if (cached) {
      logger.debug('Cache hit for articles list');
      return cached;
    }

    const { articles, total } = await articleRepository.findAll({
      limit: pagination.limit,
      offset: pagination.offset,
      language: params.language,
      categorySlug: params.category,
      countryCode: params.country,
      sourceSlug: params.source,
      search: params.search,
    });

    const result = paginate(articles, total, pagination);
    await cacheSet(cacheKey, result, 120);
    return result;
  }

  async getArticleById(id: string, language?: string) {
    const cacheKey = `article:${id}:${language || 'en'}`;
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const article = await articleRepository.findById(id, language);
    if (!article) throw new NotFoundError('Article');

    await articleRepository.incrementViewCount(id);
    await cacheSet(cacheKey, article, 300);
    return article;
  }

  async getTrending(limit = 10, language?: string) {
    const cacheKey = `trending:${language || 'en'}:${limit}`;
    const cached = await cacheGet<Record<string, unknown>[]>(cacheKey);
    if (cached) return cached;

    const articles = await articleRepository.getTrending(limit, language);
    await cacheSet(cacheKey, articles, 180);
    return articles;
  }

  async saveArticle(userId: string, articleId: string) {
    const article = await articleRepository.findById(articleId);
    if (!article) throw new NotFoundError('Article');
    await articleRepository.saveForUser(userId, articleId);
  }

  async unsaveArticle(userId: string, articleId: string) {
    await articleRepository.unsaveForUser(userId, articleId);
  }

  async getSavedArticles(userId: string, page?: string | number, limit?: string | number, language?: string) {
    const pagination = parsePagination(page, limit);
    const { articles, total } = await articleRepository.getSavedByUser(userId, pagination.limit, pagination.offset, language);
    return paginate(articles, total, pagination);
  }

  async addReaction(userId: string, articleId: string, reactionType: string) {
    const article = await articleRepository.findById(articleId);
    if (!article) throw new NotFoundError('Article');
    await articleRepository.addReaction(userId, articleId, reactionType);
    await cacheDelete(`article:${articleId}:*`);
  }

  async removeReaction(userId: string, articleId: string) {
    await articleRepository.removeReaction(userId, articleId);
  }

  async addComment(userId: string, articleId: string, content: string, parentId?: string) {
    const article = await articleRepository.findById(articleId);
    if (!article) throw new NotFoundError('Article');
    return articleRepository.addComment(userId, articleId, content, parentId);
  }

  async getComments(articleId: string, page?: string | number, limit?: string | number) {
    const pagination = parsePagination(page, limit);
    const { comments, total } = await articleRepository.getComments(articleId, pagination.limit, pagination.offset);
    return paginate(comments, total, pagination);
  }

  async shareArticle(userId: string, articleId: string, platform: string) {
    const article = await articleRepository.findById(articleId);
    if (!article) throw new NotFoundError('Article');
    await articleRepository.recordShare(userId, articleId, platform);
  }

  async invalidateCache() {
    await cacheDelete('articles:*');
    await cacheDelete('article:*');
    await cacheDelete('trending:*');
    logger.info('Article cache invalidated');
  }
}

export const articleService = new ArticleService();
