const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:2011ThaylaLunaMel2013@127.0.0.1:5432/app_db'
});

async function run() {
  await pool.query('DROP TABLE IF EXISTS transactions CASCADE;');
  await pool.query('DROP TABLE IF EXISTS transaction_types CASCADE;');
  console.log('Tables dropped');
  process.exit(0);
}
run();
