const pg = require('pg');
const fs = require('fs');
const { Pool } = pg;
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'Jeffrey@9010',
  port: 5432,
});
async function test() {
  const c = await pool.query("SELECT category_name FROM categories ORDER BY category_name ASC");
  fs.writeFileSync('cats.json', JSON.stringify(c.rows.map(r => r.category_name), null, 2));
  process.exit(0);
}
test().catch(e => { console.error('Error:', e); process.exit(1); });
