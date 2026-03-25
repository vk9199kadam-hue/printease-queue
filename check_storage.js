import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSize() {
  try {
    const res = await pool.query("SELECT pg_size_pretty(pg_total_relation_size('file_storage')) as usage, (SELECT count(*) FROM file_storage) as files");
    console.log('--- STORAGE USAGE ---');
    console.log(JSON.stringify(res.rows[0], null, 2));
    console.log('---------------------');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkSize();
