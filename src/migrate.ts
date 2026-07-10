import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from './db.js';

async function migrate() {
  try {
    console.log('Reading schema_v2.sql...');
    const schemaPath = path.resolve('schema_v2.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Connecting to database and running schema...');
    await pool.query(sql);

    console.log('Database successfully initialized!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await pool.end();
  }
}

migrate();
