import { articleRepository } from '../repositories/article.repository';
import { sourceRepository } from '../repositories/source.repository';
import { categoryRepository } from '../repositories/category.repository';
import { articleService } from './article.service';
import { query } from '../config/database';
import { generateContentHash, generateId } from '../utils/hash';
import { IngestArticlePayload } from '../types';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

export class IngestionService {
  async ingestArticle(payload: IngestArticlePayload): Promise<{ id: string; status: 'created' | 'duplicate' }> {
    const contentHash = generateContentHash(payload.title, payload.original_url);

    const existing = await articleRepository.findByContentHash(contentHash);
    if (existing) {
      logger.info('Duplicate article skipped', { url: payload.original_url, hash: contentHash });
      return { id: existing.id, status: 'duplicate' };
    }

    const source = await sourceRepository.findBySlug(payload.source_slug);
    if (!source) throw new NotFoundError(`Source '${payload.source_slug}'`);

    let categoryId: string | undefined;
    if (payload.category_slug) {
      const category = await categoryRepository.findBySlug(payload.category_slug);
      if (category) categoryId = category.id;
    }

    let tagIds: string[] | undefined;
    if (payload.tags?.length) {
      tagIds = [];
      for (const tagName of payload.tags) {
        const slug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const existing = await query<{ id: string }>('SELECT id FROM tags WHERE slug = $1', [slug]);
        if (existing.rows[0]) {
          tagIds.push(existing.rows[0].id);
        } else {
          const id = generateId();
          await query('INSERT INTO tags (id, slug, name) VALUES ($1,$2,$3)', [id, slug, tagName]);
          tagIds.push(id);
        }
      }
    }

    const article = await articleRepository.create({
      source_id: source.id,
      category_id: categoryId,
      original_url: payload.original_url,
      content_hash: contentHash,
      title: payload.title,
      summary: payload.summary,
      content: payload.content,
      image_url: payload.image_url,
      author: payload.author,
      published_at: new Date(payload.published_at),
      language: payload.language,
      translations: payload.translations,
      tag_ids: tagIds,
    });

    await articleService.invalidateCache();
    logger.info('Article ingested', { id: article.id, title: payload.title });
    return { id: article.id, status: 'created' };
  }

  async ingestBatch(payloads: IngestArticlePayload[]): Promise<{ created: number; duplicates: number; errors: number }> {
    let created = 0;
    let duplicates = 0;
    let errors = 0;

    for (const payload of payloads) {
      try {
        const result = await this.ingestArticle(payload);
        if (result.status === 'created') created++;
        else duplicates++;
      } catch (error) {
        errors++;
        logger.error('Failed to ingest article', {
          url: payload.original_url,
          error: (error as Error).message,
        });
      }
    }

    if (created > 0) await articleService.invalidateCache();
    logger.info('Batch ingestion complete', { created, duplicates, errors });
    return { created, duplicates, errors };
  }
}

export const ingestionService = new IngestionService();
