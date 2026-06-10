/**
 * 🏥 生命徵象監測儀 —— 看六張工單的慘況與復原進度
 * 用法：npm run measure        （全部）
 *       npm run measure 4     （只量工單 4）
 */
const { createClient } = require('./db');
const { judgeQuery } = require('./judge');
const { tickets } = require('./tickets');

const LIGHT = { red: '🔴', yellow: '🟡', green: '🟢' };

function fmtScan(r) {
  if (r.scanned <= r.returned) return `摸了 ${r.returned.toLocaleString()} 列`;
  return `掃了 ${r.scanned.toLocaleString()} 列，只為了 ${r.returned.toLocaleString()} 列`;
}

async function main() {
  const only = process.argv[2] ? Number(process.argv[2]) : null;
  const list = only ? tickets.filter((t) => t.no === only) : tickets;
  if (list.length === 0) { console.error(`沒有工單 ${only}`); process.exit(1); }

  const client = createClient();
  await client.connect();

  console.log('\n🏥 LiveFit 效能急救室 — 生命徵象\n');
  const results = [];

  for (const t of list) {
    let sql = t.sql;
    let note = '';

    if (t.no === 6) {
      const rewrite = t.readRewrite();
      if (!rewrite) {
        sql = t.originalSql;
        note = '（還沒改寫 queries/06-rewrite.sql，量的是原查詢）';
      } else {
        sql = rewrite;
        if (t.checkResult) {
          const [a, b] = await Promise.all([
            client.query(t.originalSql),
            client.query(rewrite),
          ]).catch(() => [null, null]);
          const orig = a && a.rows[0] ? Object.values(a.rows[0])[0] : null;
          const mine = b && b.rows[0] ? Object.values(b.rows[0])[0] : null;
          note = String(orig) === String(mine)
            ? `（改寫結果一致 ✓ ${Number(orig).toLocaleString()} 筆）`
            : `（⚠️ 改寫結果 ${mine} ≠ 原查詢 ${orig}，方向對了但範圍寫錯）`;
        }
      }
    }

    let r;
    try {
      await client.query(sql); // 暖身一次，量第二次（避免冷快取亂跳）
      r = await judgeQuery(client, sql, t.table);
      if (t.no === 6 && note.includes('≠')) r.light = 'red';
    } catch (e) {
      r = { light: 'red', nodeType: 'SQL 錯誤', ms: 0, returned: 0, removed: 0, scanned: 0 };
      note = `（${e.message.slice(0, 60)}）`;
    }

    results.push({ t, r });
    const ms = r.ms >= 100 ? `${(r.ms / 1000).toFixed(2)}s` : `${r.ms.toFixed(1)}ms`;
    console.log(`  ${LIGHT[r.light]} 工單${t.no}｜${t.title}`);
    console.log(`      ${ms}　${fmtScan(r)}　[${r.nodeType}]${r.light === 'yellow' ? '　← 吃到索引了，但還能更準（Rows Removed ' + r.removed.toLocaleString() + '）' : ''} ${note}`);
  }

  console.log('');
  const greens = results.filter((x) => x.r.light === 'green').length;
  if (!only && greens === tickets.length) {
    console.log('  ✅ 六張工單全數結案 —— LiveFit 又能準時開課了，準時下班！\n');
  } else if (!only) {
    console.log(`  進度 ${greens}/${tickets.length}：對紅燈的工單跑 EXPLAIN ANALYZE 找病因，解法寫進 optimize.sql 再 npm run optimize\n`);
  }
  await client.end();
}

main().catch((e) => { console.error('量測失敗：', e.message); process.exit(1); });
