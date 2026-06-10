/**
 * 把指定的 SQL 檔灌進資料庫（npm run optimize 用它執行 optimize.sql）
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('./db');

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('用法：node scripts/run-sql.js <檔名>'); process.exit(1); }
  const p = path.resolve(process.cwd(), file);
  const raw = fs.readFileSync(p, 'utf8');
  const sql = raw.replace(/--.*$/gm, '').trim();
  if (!sql) { console.log(`（${file} 目前只有註解，沒有可執行的 SQL）`); return; }

  const client = createClient();
  await client.connect();
  const t0 = Date.now();
  await client.query(sql);
  await client.query('ANALYZE');
  console.log(`✅ ${file} 執行完成（${((Date.now() - t0) / 1000).toFixed(1)}s，統計資訊已更新）— 跑 npm run measure 看戰果`);
  await client.end();
}

main().catch((e) => { console.error(`執行失敗：${e.message}`); process.exit(1); });
