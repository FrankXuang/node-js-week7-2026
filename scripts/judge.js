/**
 * 紅綠燈判定引擎 —— measure 跟 npm test 用同一顆，本機看到的燈就是 CI 的燈
 *
 * 判定不用「秒數」（每台電腦快慢不同），用「執行計畫」（全班一致）：
 *   🔴 red    主表還在 Seq Scan（一筆一筆掃全表）
 *   🟡 yellow 吃到索引了，但 Rows Removed by Filter > 1000（索引還能更準）
 *   🟢 green  吃到索引且幾乎不浪費
 */

const GREEN_TYPES = new Set(['Index Scan', 'Index Only Scan']);

/** 在計畫樹裡找「碰到目標表」的節點 */
function findTableNode(node, table) {
  if (node['Relation Name'] === table) return node;
  for (const child of node.Plans || []) {
    const hit = findTableNode(child, table);
    if (hit) return hit;
  }
  return null;
}

/** 子樹裡有沒有 Bitmap Index Scan（Bitmap Heap Scan 的綠燈條件） */
function hasBitmapIndex(node) {
  if (node['Node Type'] === 'Bitmap Index Scan') return true;
  return (node.Plans || []).some(hasBitmapIndex);
}

/**
 * 對單一查詢做判定
 * @returns {{ light, nodeType, ms, returned, removed, scanned }}
 */
async function judgeQuery(client, sql, table) {
  await client.query(`SET statement_timeout = '60s'`);
  const { rows } = await client.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`);
  const root = rows[0]['QUERY PLAN'][0];
  const plan = root.Plan;
  const ms = root['Execution Time'];

  const node = findTableNode(plan, table);
  if (!node) return { light: 'red', nodeType: '(找不到節點)', ms, returned: 0, removed: 0, scanned: 0 };

  const type = node['Node Type'];
  // ⚠️ Rows Removed by Filter 是 per-loop 平均值，不要乘 loops（會誤判黃燈）
  const removed = node['Rows Removed by Filter'] || 0;
  const loops = node['Actual Loops'] || 1;
  // 掃描量 = 表節點實際碰的列（per-loop × loops）
  const scanned = Math.round(((node['Actual Rows'] || 0) + removed) * loops);
  // 「找到幾列」用樹根節點（= 使用者實際拿到的），避免平行查詢 per-loop 平均失真
  const returned = plan['Actual Rows'] || 0;

  let light = 'red';
  if (GREEN_TYPES.has(type)) light = 'green';
  else if (type === 'Bitmap Heap Scan' && hasBitmapIndex(node)) light = 'green';

  if (light === 'green' && removed > 1000) light = 'yellow';

  return { light, nodeType: type, ms, returned, removed, scanned };
}

module.exports = { judgeQuery, findTableNode };
