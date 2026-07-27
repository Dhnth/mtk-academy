import { Pool, QueryResult, QueryResultRow } from 'pg';

// PostgreSQL connection pool untuk Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10, // Kurangi dari 20 jadi 10
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Naikkan dari 2000 jadi 5000
  // Tambahkan timeout untuk query
  statement_timeout: 10000, // 10 detik
  query_timeout: 10000,
});

// Event listeners untuk monitoring
pool.on('error', (err) => {
  console.error('❌ Unexpected pool error:', err.message);
});

pool.on('connect', () => {
  console.log('🔌 New client connected to database');
});

pool.on('remove', () => {
  console.log('🔌 Client removed from pool');
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

// Generic query function dengan retry logic
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: QueryParams = [],
  retries: number = 2
): Promise<QueryResult<T>> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const client = await pool.connect();
    try {
      const result = await client.query<T>(sql, params);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Query attempt ${attempt + 1} failed:`, error);
      
      // Jika error connection, coba lagi
      if (error instanceof Error && 
          (error.message.includes('Connection terminated') || 
           error.message.includes('timeout') ||
           error.message.includes('Connection timed out'))) {
        // Tunggu sebentar sebelum retry
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      throw error;
    } finally {
      client.release();
    }
  }
  
  throw lastError || new Error('Query failed after retries');
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

// Fungsi untuk close pool (berguna saat shutdown)
export async function closePool() {
  await pool.end();
  console.log('📦 Database pool closed');
}