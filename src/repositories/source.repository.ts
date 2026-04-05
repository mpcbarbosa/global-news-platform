import { query } from '../config/database';
import { SourceRow } from '../types';

export class SourceRepository {
  async findBySlug(slug: string): Promise<SourceRow | null> {
    const result = await query<SourceRow>('SELECT * FROM sources WHERE slug = $1 AND is_active = true', [slug]);
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<SourceRow | null> {
    const result = await query<SourceRow>('SELECT * FROM sources WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findAll(countryCode?: string): Promise<SourceRow[]> {
    if (countryCode) {
      const result = await query<SourceRow>(
        `SELECT s.* FROM sources s
         JOIN countries c ON c.id = s.country_id
         WHERE s.is_active = true AND c.code = $1
         ORDER BY s.name ASC`,
        [countryCode]
      );
      return result.rows;
    }
    const result = await query<SourceRow>('SELECT * FROM sources WHERE is_active = true ORDER BY name ASC');
    return result.rows;
  }
}

export const sourceRepository = new SourceRepository();
