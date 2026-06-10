/**
 * 灌入 LiveFit 正式資料庫種子（約 130 萬筆，數十秒）
 * 種子的時間軸固定在 STORY_NOW（2026-07-24 18:00+08），全班資料一模一樣
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('./db');

async function main() {
  const sqlPath = path.join(__dirname, 'seed.sql');
  const raw = fs.readFileSync(sqlPath, 'utf8');

  // 依 "-- STEP:" 切段，逐段執行印進度
  const parts = raw.split(/^-- STEP: (.+)$/m);
  const steps = [];
  for (let i = 1; i < parts.length; i += 2) {
    steps.push({ label: parts[i].trim(), sql: parts[i + 1] });
  }

  const client = createClient();
  await client.connect();
  console.log('🏗  開始建置 LiveFit 正式資料庫…\n');
  const t0 = Date.now();

  for (const step of steps) {
    const s = Date.now();
    process.stdout.write(`  ▸ ${step.label} … `);
    await client.query(step.sql);
    console.log(`${((Date.now() - s) / 1000).toFixed(1)}s`);
  }

  const { rows } = await client.query(`
    SELECT (SELECT count(*) FROM users)            AS users,
           (SELECT count(*) FROM courses)          AS courses,
           (SELECT count(*) FROM course_bookings)  AS bookings,
           (SELECT count(*) FROM credit_purchases) AS purchases,
           (SELECT count(*) FROM orders)           AS orders
  `);
  const c = rows[0];
  console.log(`\n✅ 完成（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
  console.log(`   會員 ${Number(c.users).toLocaleString()}、課程 ${Number(c.courses).toLocaleString()}、報名 ${Number(c.bookings).toLocaleString()}、購買 ${Number(c.purchases).toLocaleString()}、訂單 ${Number(c.orders).toLocaleString()}`);
  console.log('   接下來跑 npm run measure 看看災情有多慘 🚑');
  await client.end();
}

main().catch((e) => { console.error('種子灌入失敗：', e.message); process.exit(1); });
