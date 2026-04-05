import { query } from '../config/database';
import { CountryRow } from '../types';

export class CountryRepository {
  async findAll(language?: string): Promise<Record<string, unknown>[]> {
    const lang = language || 'en';
    const result = await query<Record<string, unknown>>(
      `SELECT c.id, c.code, COALESCE(ct.name, c.name) AS name, c.flag_emoji
       FROM countries c
       LEFT JOIN country_translations ct ON ct.country_id = c.id AND ct.language = $1
       WHERE c.is_active = true
       ORDER BY c.name ASC`,
      [lang]
    );
    return result.rows;
  }

  async findByCode(code: string): Promise<CountryRow | null> {
    const result = await query<CountryRow>('SELECT * FROM countries WHERE code = $1 AND is_active = true', [code]);
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<CountryRow | null> {
    const result = await query<CountryRow>('SELECT * FROM countries WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}

export const countryRepository = new CountryRepository();
