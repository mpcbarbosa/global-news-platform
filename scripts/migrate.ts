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

async function migrate() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // In compiled JS (dist/scripts/migrate.js), __dirname = <root>/dist/scripts
    // We need to go up 2 levels to project root, then into migrations/
    const migrationsDir = path.resolve(__dirname, '..', '..', 'migrations');
    console.log('📂 Looking for migrations in:', migrationsDir);

    if (!fs.existsSync(migrationsDir)) {
      console.error('❌ Migrations directory not found:', migrationsDir);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`📋 Found ${files.length} migration files`);

    const executed = await pool.query('SELECT name FROM _migrations ORDER BY name');
    const executedNames = new Set(executed.rows.map((r: { name: string }) => r.name));

    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`▶️  Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(`✅ ${file} executed successfully`);
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`❌ ${file} failed:`, (error as Error).message);
        throw error;
      }
    }

    console.log('\n🎉 All migrations complete!');
  } catch (error) {
    console.error('Migration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
