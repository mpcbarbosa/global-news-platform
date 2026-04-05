import { query, transaction } from '../config/database';
import { ArticleRow } from '../types';
import { generateId } from '../utils/hash';

export class ArticleRepository {
  async findById(id: string, language?: string): Promise<Record<string, unknown> | null> {
    const lang = language || 'en';
    const result = await query<Record<string, unknown>>(
      `SELECT a.*,
              COALESCE(at.title, a.title) AS display_title,
              COALESCE(at.summary, a.summary) AS display_summary,
              COALESCE(at.content, a.content) AS display_content,
              s.name AS source_name, s.slug AS source_slug,
              c.slug AS category_slug, c.name AS category_name
       FROM articles a
       LEFT JOIN article_translations at ON at.article_id = a.id AND at.language = $2
       LEFT JOIN sources s ON s.id = a.source_id
       LEFT JOIN categories c ON c.id = a.category_id
       WHERE a.id = $1 AND a.is_active = true`,
      [id, lang]
    );
    return result.rows[0] || null;
  }

  async findByContentHash(hash: string): Promise<ArticleRow | null> {
    const result = await query<ArticleRow>('SELECT * FROM articles WHERE content_hash = $1', [hash]);
    return result.rows[0] || null;
  }

  async findAll(params: {
    limit: number;
    offset: number;
    language?: string;
    categorySlug?: string;
    countryCode?: string;
    sourceSlug?: string;
    search?: string;
  }): Promise<{ articles: Record<string, unknown>[]; total: number }> {
    const conditions: string[] = ['a.is_active = true'];
    const values: unknown[] = [];
    let idx = 1;

    if (params.categorySlug) {
      conditions.push(`c.slug = $${idx++}`);
      values.push(params.categorySlug);
    }
    if (params.countryCode) {
      conditions.push(`co.code = $${idx++}`);
      values.push(params.countryCode);
    }
    if (params.sourceSlug) {
      conditions.push(`s.slug = $${idx++}`);
      values.push(params.sourceSlug);
    }
    if (params.search) {
      conditions.push(`(a.title ILIKE $${idx} OR a.summary ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');
    const lang = params.language || 'en';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM articles a
       LEFT JOIN sources s ON s.id = a.source_id
       LEFT JOIN categories c ON c.id = a.category_id
       LEFT JOIN countries co ON co.id = s.country_id
       WHERE ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(lang, params.limit, params.offset);
    const result = await query<Record<string, unknown>>(
      `SELECT a.id, a.original_url, a.image_url, a.author, a.published_at, a.view_count, a.language, a.created_at,
              COALESCE(at.title, a.title) AS title,
              COALESCE(at.summary, a.summary) AS summary,
              s.name AS source_name, s.slug AS source_slug, s.logo_url AS source_logo,
              c.slug AS category_slug,
              COALESCE(ct.name, c.name) AS category_name,
              co.code AS country_code, co.flag_emoji AS country_flag
       FROM articles a
       LEFT JOIN article_translations at ON at.article_id = a.id AND at.language = $${idx++}
       LEFT JOIN sources s ON s.id = a.source_id
       LEFT JOIN categories c ON c.id = a.category_id
       LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.language = at.language
       LEFT JOIN countries co ON co.id = s.country_id
       WHERE ${where}
       ORDER BY a.published_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    return { articles: result.rows, total };
  }

  async create(data: {
    source_id: string;
    category_id?: string;
    original_url: string;
    content_hash: string;
    title: string;
    summary?: string;
    content?: string;
    image_url?: string;
    author?: string;
    published_at: Date;
    language: string;
    translations?: { language: string; title: string; summary?: string; content?: string }[];
    tag_ids?: string[];
  }): Promise<ArticleRow> {
    const id = generateId();

    const result = await transaction(async (q) => {
      const articleResult = await q(
        `INSERT INTO articles (id, source_id, category_id, original_url, content_hash, title, summary, content, image_url, author, published_at, language)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [id, data.source_id, data.category_id || null, data.original_url, data.content_hash,
         data.title, data.summary || null, data.content || null, data.image_url || null,
         data.author || null, data.published_at, data.language]
      );

      if (data.translations?.length) {
        for (const t of data.translations) {
          await q(
            `INSERT INTO article_translations (id, article_id, language, title, summary, content)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [generateId(), id, t.language, t.title, t.summary || null, t.content || null]
          );
        }
      }

      if (data.tag_ids?.length) {
        for (const tagId of data.tag_ids) {
          await q(
            'INSERT INTO article_tags (article_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [id, tagId]
          );
        }
      }

      return articleResult;
    });

    return result.rows[0] as ArticleRow;
  }

  async incrementViewCount(id: string): Promise<void> {
    await query('UPDATE articles SET view_count = view_count + 1 WHERE id = $1', [id]);
  }

  async getTrending(limit: number, language?: string): Promise<Record<string, unknown>[]> {
    const lang = language || 'en';
    const result = await query<Record<string, unknown>>(
      `SELECT a.id, a.original_url, a.image_url, a.author, a.published_at, a.view_count,
              COALESCE(at.title, a.title) AS title,
              COALESCE(at.summary, a.summary) AS summary,
              s.name AS source_name, s.slug AS source_slug,
              c.slug AS category_slug
       FROM articles a
       LEFT JOIN article_translations at ON at.article_id = a.id AND at.language = $1
       LEFT JOIN sources s ON s.id = a.source_id
       LEFT JOIN categories c ON c.id = a.category_id
       WHERE a.is_active = true AND a.published_at > NOW() - INTERVAL '48 hours'
       ORDER BY a.view_count DESC, a.published_at DESC
       LIMIT $2`,
      [lang, limit]
    );
    return result.rows;
  }

  async saveForUser(userId: string, articleId: string): Promise<void> {
    await query(
      `INSERT INTO saved_articles (id, user_id, article_id)
       VALUES ($1,$2,$3) ON CONFLICT (user_id, article_id) DO NOTHING`,
      [generateId(), userId, articleId]
    );
  }

  async unsaveForUser(userId: string, articleId: string): Promise<void> {
    await query('DELETE FROM saved_articles WHERE user_id = $1 AND article_id = $2', [userId, articleId]);
  }

  async getSavedByUser(userId: string, limit: number, offset: number, language?: string): Promise<{ articles: Record<string, unknown>[]; total: number }> {
    const lang = language || 'en';
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) FROM saved_articles WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query<Record<string, unknown>>(
      `SELECT a.id, a.original_url, a.image_url, a.author, a.published_at, a.view_count,
              COALESCE(at.title, a.title) AS title,
              COALESCE(at.summary, a.summary) AS summary,
              s.name AS source_name, sa.created_at AS saved_at
       FROM saved_articles sa
       JOIN articles a ON a.id = sa.article_id
       LEFT JOIN article_translations at ON at.article_id = a.id AND at.language = $1
       LEFT JOIN sources s ON s.id = a.source_id
       WHERE sa.user_id = $2 AND a.is_active = true
       ORDER BY sa.created_at DESC LIMIT $3 OFFSET $4`,
      [lang, userId, limit, offset]
    );
    return { articles: result.rows, total };
  }

  async addReaction(userId: string, articleId: string, reactionType: string): Promise<void> {
    await query(
      `INSERT INTO article_reactions (id, article_id, user_id, reaction_type)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (article_id, user_id) DO UPDATE SET reaction_type = $4`,
      [generateId(), articleId, userId, reactionType]
    );
  }

  async removeReaction(userId: string, articleId: string): Promise<void> {
    await query('DELETE FROM article_reactions WHERE user_id = $1 AND article_id = $2', [userId, articleId]);
  }

  async addComment(userId: string, articleId: string, content: string, parentId?: string): Promise<Record<string, unknown>> {
    const id = generateId();
    const result = await query<Record<string, unknown>>(
      `INSERT INTO article_comments (id, article_id, user_id, parent_id, content)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, articleId, userId, parentId || null, content]
    );
    return result.rows[0];
  }

  async getComments(articleId: string, limit: number, offset: number): Promise<{ comments: Record<string, unknown>[]; total: number }> {
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) FROM article_comments WHERE article_id = $1 AND is_active = true',
      [articleId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query<Record<string, unknown>>(
      `SELECT ac.*, u.display_name, u.avatar_url
       FROM article_comments ac
       JOIN users u ON u.id = ac.user_id
       WHERE ac.article_id = $1 AND ac.is_active = true
       ORDER BY ac.created_at ASC LIMIT $2 OFFSET $3`,
      [articleId, limit, offset]
    );
    return { comments: result.rows, total };
  }

  async recordShare(userId: string, articleId: string, platform: string): Promise<void> {
    await query(
      'INSERT INTO article_shares (id, article_id, user_id, platform) VALUES ($1,$2,$3,$4)',
      [generateId(), articleId, userId, platform]
    );
  }
}

export const articleRepository = new ArticleRepository();
