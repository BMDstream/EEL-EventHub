import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1, // Keep connections low in serverless environment
  idle_timeout: 20,
  connect_timeout: 30,
});

export default sql;
