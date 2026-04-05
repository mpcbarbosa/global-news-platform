import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

async function seed() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const seedFile = path.join(__dirname, '..', 'migrations', '002_seed_data.sql');
    const sql = fs.readFileSync(seedFile, 'utf8');

    console.log('🌱 Running seed data...');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('COMMIT');
      console.log('✅ Seed data inserted successfully!');
    } catch (error) {
      await pool.query('ROLLBACK');
      const msg = (error as Error).message;
      if (msg.includes('duplicate') || msg.includes('already exists')) {
        console.log('⏭️  Seed data already exists, skipping');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Seed failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
