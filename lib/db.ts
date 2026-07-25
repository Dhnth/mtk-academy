import { Pool, QueryResult, QueryResultRow } from 'pg';

// PostgreSQL connection pool untuk Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.connect((err: Error | undefined) => {
  if (err) {
    console.error('❌ Failed to connect to Supabase PostgreSQL:', err.message);
  } else {
    console.log('✅ Connected to Supabase PostgreSQL');
  }
});

// Type untuk parameter query
type QueryParams = (string | number | boolean | null | undefined)[];

// Generic query function dengan tipe generik yang benar
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: QueryParams = []
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// Untuk mendapatkan connection (jika perlu transaksi)
export async function getConnection() {
  return await pool.connect();
}

// Export pool untuk keperluan lain
export { pool };

// Helper functions dengan tipe generik yang benar
export function getRows<T extends QueryResultRow = QueryResultRow>(
  result: QueryResult<T>
): T[] {
  return result.rows;
}

export function getFirstRow<T extends QueryResultRow = QueryResultRow>(
  result: QueryResult<T>
): T | null {
  return result.rows.length > 0 ? result.rows[0] : null;
}

export function getRowCount(result: QueryResult): number {
  return result.rowCount || 0;
}