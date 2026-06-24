/**
 * 六張效能工單的定義（查詢、主表、營運抱怨）
 * STORY_NOW：本作業的「現在」固定在 2026-07-24 18:00（種子的時間錨點）
 */
const fs = require('fs');
const path = require('path');

const STORY_NOW = `TIMESTAMPTZ '2026-07-24 18:00:00+08'`;

/** 讀工單 6 的改寫檔（學生要動的檔案），去掉註解後回傳 SQL */
function readRewrite() {
  const p = path.join(__dirname, '..', 'queries', '06-rewrite.sql');
  const raw = fs.readFileSync(p, 'utf8');
  const sql = raw.replace(/--.*$/gm, '').trim();
  return sql.length > 0 ? sql : null;
}

const tickets = [
  {
    no: 1,
    title: '客服查會員',
    complaint: '客服輸入會員 email 查資料需等好幾秒，客人都等到掛電話了...',
    table: 'users',
    sql: `SELECT * FROM users WHERE email = 'user250000@livefit.tw'`,
  },
  {
    no: 2,
    title: '企業會員的課表打不開',
    complaint: '企業戶「喵喵物流」反映，打開團課課表時，畫面要轉好久',
    table: 'course_bookings',
    sql: `SELECT * FROM course_bookings WHERE user_id = 1003 AND cancelled_at IS NULL`,
  },
  {
    no: 3,
    title: '最新購買紀錄牆',
    complaint: '後台首頁要顯示最新 100 筆購買紀錄，但每次進來都會卡一下。',
    table: 'credit_purchases',
    sql: `SELECT * FROM credit_purchases ORDER BY purchase_at DESC LIMIT 100`,
  },
  {
    no: 4,
    title: '首頁「進行中課程」',
    complaint: '首頁的「進行中課程」區塊越來越慢。對了，上個班次的工程師曾經在 start_at 加過索引，但因為沒有效果，所以就先刪除了。',
    table: 'courses',
    sql: `SELECT * FROM courses WHERE start_at <= ${STORY_NOW} AND end_at > ${STORY_NOW}`,
  },
  {
    no: 5,
    title: '上週開課課程的教練報名統計',
    complaint: '每週開會都需要看「上週開課課程」的教練報名數量，但查詢這張報表實在太慢，所以大家都會先去泡咖啡。（提醒：這個工單似乎有兩個病灶。另外可使用 npm run measure 5 單條跑較節省時間。）',
    table: 'course_bookings',
    sql: `SELECT u.name, COUNT(*) AS bookings
FROM courses c
JOIN course_bookings b ON b.course_id = c.id
JOIN users u ON u.id = c.user_id
WHERE c.start_at >= ${STORY_NOW} - interval '7 days'
  AND c.start_at <  ${STORY_NOW}
  AND b.cancelled_at IS NULL
GROUP BY u.name`,
  },
  {
    no: 6,
    title: '爆量日報名查詢',
    complaint: '上個班次工程師交接備註：created_at 的索引我早就加了，但客服說查 6/24 週年慶那天的報名還是超慢。接力給你。提醒 ⚠️：營運說資料庫寫入已經夠慢，這張不可再加任何索引。方向：把 queries/06-rewrite.sql 裡的查詢改寫來吃到現有索引。',
    table: 'course_bookings',
    originalSql: `SELECT count(*) AS total FROM course_bookings WHERE DATE(created_at) = DATE '2026-06-24'`,
    readRewrite,
    checkResult: true,
  },
];

module.exports = { tickets, STORY_NOW };
