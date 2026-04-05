import { query } from '../config/database';
import { CategoryRow } from '../types';

export class CategoryRepository {
  async findAll(language?: string): Promise<Record<string, unknown>[]> {
    const lang = language || 'en';
    const result = await query<Record<string, unknown>>(
      `SELECT c.id, c.slug, COALESCE(ct.name, c.name) AS name, c.icon, c.sort_order
       FROM categories c
       LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.language = $1
       WHERE c.is_active = true
       ORDER BY c.sort_order ASC`,
      [lang]
    );
    return result.rows;
  }

  async findBySlug(slug: string): Promise<CategoryRow | null> {
    const result = await query<CategoryRow>('SELECT * FROM categories WHERE slug = $1 AND is_active = true', [slug]);
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<CategoryRow | null> {
    const result = await query<CategoryRow>('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}

export const categoryRepository = new CategoryRepository();
