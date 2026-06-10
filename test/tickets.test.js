/**
 * 六張工單的驗收（跟 npm run measure 用同一顆判定引擎）
 * 通過標準：每張工單 🟢 全綠（🟡 = 索引還能更準，不算過）
 */
const { createClient } = require('../scripts/db');
const { judgeQuery } = require('../scripts/judge');
const { tickets } = require('../scripts/tickets');

let client;
beforeAll(async () => { client = createClient(); await client.connect(); });
afterAll(async () => { await client.end(); });

describe('🚑 效能急救室驗收', () => {
  for (const t of tickets.filter((x) => x.no <= 5)) {
    test(`工單${t.no}｜${t.title} — 查詢要吃到索引（全綠）`, async () => {
      await client.query(t.sql); // 暖身
      const r = await judgeQuery(client, t.sql, t.table);
      if (r.light === 'yellow') {
        throw new Error(`綠中帶黃：吃到索引了，但 Rows Removed by Filter = ${r.removed.toLocaleString()}（>1000）——索引還能更準，想想複合索引的欄位`);
      }
      expect(r.light).toBe('green');
    });
  }

  describe('工單6｜爆量日報名查詢（改寫題）', () => {
    const t6 = tickets.find((x) => x.no === 6);

    test('queries/06-rewrite.sql 要有你的改寫查詢', () => {
      expect(t6.readRewrite()).not.toBeNull();
    });

    test('改寫後的結果要跟原查詢一致（而且不是 0 筆）', async () => {
      const rewrite = t6.readRewrite();
      const orig = await client.query(t6.originalSql);
      const mine = await client.query(rewrite);
      const a = Number(Object.values(orig.rows[0])[0]);
      const b = Number(Object.values(mine.rows[0])[0]);
      expect(a).toBeGreaterThan(0); // sanity：爆量日真的有資料
      expect(b).toBe(a);
    });

    test('改寫後的查詢要吃到現有索引（全綠）', async () => {
      const rewrite = t6.readRewrite();
      await client.query(rewrite);
      const r = await judgeQuery(client, rewrite, t6.table);
      expect(r.light).toBe('green');
    });
  });
});
