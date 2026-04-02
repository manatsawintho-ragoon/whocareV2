import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

pg.types.setTypeParser(1082, (val) => val);

const pool = new pg.Pool({
  connectionString: `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
  // Required for Supabase session pooler (pgBouncer) compatibility
  query_timeout: 30000,
});

const query = async (text, params) => {
  const result = await pool.query(text, params);
  return [result.rows, result.fields];
};

// Test connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL (Supabase) connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    return false;
  }
};

// Export pool with wrapped query
export default { query, getConnection: () => pool.connect() };
