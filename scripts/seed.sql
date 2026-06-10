-- ============================================================
-- LiveFit 正式資料庫種子（W7 效能急救室）
-- 時間錨點 STORY_NOW = 2026-07-24 18:00:00+08（全部時間以此為準，禁用 now()）
-- setseed 固定亂數：全班種出一模一樣的資料
-- ============================================================

-- STEP: 重建資料表
DROP TABLE IF EXISTS orders, credit_purchases, credit_packages,
  course_bookings, courses, coach_link_skill, skills, coaches, users CASCADE;

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'USER',
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE coaches (
  id               SERIAL PRIMARY KEY,
  user_id          INT NOT NULL,
  experience_years INT NOT NULL,
  description      TEXT
);

CREATE TABLE skills (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE coach_link_skill (
  id       SERIAL PRIMARY KEY,
  coach_id INT NOT NULL,
  skill_id INT NOT NULL
);

CREATE TABLE courses (
  id               SERIAL PRIMARY KEY,
  user_id          INT NOT NULL,          -- 開課教練（users.id）
  skill_id         INT NOT NULL,
  name             TEXT NOT NULL,
  start_at         TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ NOT NULL,
  max_participants INT NOT NULL DEFAULT 10
);

CREATE TABLE course_bookings (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL,
  course_id    INT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE credit_packages (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  credit_amount INT NOT NULL,
  price         NUMERIC(10,2) NOT NULL
);

CREATE TABLE credit_purchases (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL,
  credit_package_id INT NOT NULL,
  purchased_credits INT NOT NULL,
  price_paid        NUMERIC(10,2) NOT NULL,
  purchase_at       TIMESTAMPTZ NOT NULL
);

CREATE TABLE orders (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL,
  paid_at        TIMESTAMPTZ
);

-- STEP: 固定亂數種子（全班一致）
SELECT setseed(0.42);

-- STEP: 會員 30 萬（爆紅後的會員海）
INSERT INTO users (name, email, role, created_at)
SELECT
  (ARRAY['陳','林','黃','張','李','王','吳','劉','蔡','楊'])[1 + floor(random()*10)::int] ||
  (ARRAY['志明','春嬌','家豪','淑芬','建宏','美玲','俊傑','雅婷','冠宇','怡君','宗翰','佩珊','柏翰','詩涵','承恩','宜蓁'])[1 + floor(random()*16)::int],
  'user' || gs.id || '@livefit.tw',
  'USER',
  TIMESTAMPTZ '2026-07-24 18:00:00+08' - (random() * interval '90 days')
FROM generate_series(1, 300000) AS gs(id);

-- STEP: 熟面孔（pg-gym 證物切片裡的人，活在正式庫前幾排）
UPDATE users SET name='Leo Chen',  email='leo.chen@livefit.tw'  WHERE id=1;
UPDATE users SET name='Jack Pai',  email='jack.pai@livefit.tw'  WHERE id=2;
UPDATE users SET name='Nora Wang', email='nora.wang@livefit.tw' WHERE id=3;
UPDATE users SET name='Ivy Lin',   email='ivy.lin@livefit.tw'   WHERE id=4;

-- 五個重度企業會員（工單 2 的主角）
UPDATE users SET name='團課企業戶-創創科技', email='corp1@livefit.tw' WHERE id=1001;
UPDATE users SET name='團課企業戶-六角學院', email='corp2@livefit.tw' WHERE id=1002;
UPDATE users SET name='團課企業戶-喵喵物流', email='corp3@livefit.tw' WHERE id=1003;
UPDATE users SET name='團課企業戶-好好食品', email='corp4@livefit.tw' WHERE id=1004;
UPDATE users SET name='團課企業戶-山海旅行', email='corp5@livefit.tw' WHERE id=1005;

-- STEP: 教練 500 + 技能
INSERT INTO coaches (user_id, experience_years, description)
SELECT gs.id, 1 + floor(random()*15)::int, '通過認證的 LiveFit 教練'
FROM generate_series(2000, 2499) AS gs(id);
UPDATE users SET role='COACH' WHERE id BETWEEN 2000 AND 2499;

INSERT INTO skills (name) VALUES
  ('重訓'),('瑜珈'),('飛輪'),('拳擊有氧'),('皮拉提斯'),
  ('游泳'),('深蹲訓練'),('核心訓練'),('伸展放鬆'),('體態雕塑');

INSERT INTO coach_link_skill (coach_id, skill_id)
SELECT c.id, 1 + floor(random()*10)::int
FROM coaches c, generate_series(1, 3);

-- STEP: 課程 15 萬（三年長尾 + 進行中 200 + 未來課 0.5%）
-- 歷史課 149,050：start_at 用 random()^2 偏向近期（長尾分佈），至少在 3 小時前結束
INSERT INTO courses (user_id, skill_id, name, start_at, end_at, max_participants)
SELECT
  2000 + floor(random()*500)::int,
  1 + floor(random()*10)::int,
  (ARRAY['晨間','午間','晚間','週末'])[1 + floor(random()*4)::int] ||
  (ARRAY['重訓班','瑜珈課','飛輪課','拳擊有氧','皮拉提斯','核心訓練'])[1 + floor(random()*6)::int],
  ts.t,
  ts.t + interval '90 minutes',
  5 + floor(random()*20)::int
FROM (
  SELECT TIMESTAMPTZ '2026-07-24 18:00:00+08'
         - (power(random(), 2) * interval '1092 days') - interval '3 hours' AS t
  FROM generate_series(1, 149050)
) ts;

-- 進行中 200 堂（跨越 STORY_NOW，#6 敘事的主角）
INSERT INTO courses (user_id, skill_id, name, start_at, end_at, max_participants)
SELECT
  2000 + floor(random()*500)::int,
  1 + floor(random()*10)::int,
  '進行中-' || (ARRAY['重訓班','瑜珈課','飛輪課','核心訓練'])[1 + floor(random()*4)::int],
  TIMESTAMPTZ '2026-07-24 18:00:00+08' - (random() * interval '80 minutes') - interval '5 minutes',
  TIMESTAMPTZ '2026-07-24 18:00:00+08' + (random() * interval '80 minutes') + interval '5 minutes',
  5 + floor(random()*20)::int
FROM generate_series(1, 200);

-- 未來課 750 堂（0.5%，未來兩週）
INSERT INTO courses (user_id, skill_id, name, start_at, end_at, max_participants)
SELECT
  2000 + floor(random()*500)::int,
  1 + floor(random()*10)::int,
  '預約-' || (ARRAY['重訓班','瑜珈課','飛輪課','核心訓練'])[1 + floor(random()*4)::int],
  ts.t,
  ts.t + interval '90 minutes',
  5 + floor(random()*20)::int
FROM (
  SELECT TIMESTAMPTZ '2026-07-24 18:00:00+08'
         + interval '2 hours' + (random() * interval '14 days') AS t
  FROM generate_series(1, 750)
) ts;

-- STEP: 報名 100 萬（過去 90 天；30% 集中在五個企業會員；15% 取消）
INSERT INTO course_bookings (user_id, course_id, created_at, cancelled_at)
SELECT
  CASE WHEN random() < 0.3
       THEN 1001 + floor(random()*5)::int
       ELSE 1 + floor(random()*300000)::int END,
  1 + floor(random()*150000)::int,
  ts.t,
  CASE WHEN random() < 0.15 THEN ts.t + (random() * interval '3 days') END
FROM (
  SELECT TIMESTAMPTZ '2026-07-24 18:00:00+08' - (random() * interval '90 days') AS t
  FROM generate_series(1, 1000000)
) ts;

-- 週年慶爆量日（2026-06-24）追加 3 萬筆（工單 6 的案發現場）
INSERT INTO course_bookings (user_id, course_id, created_at, cancelled_at)
SELECT
  CASE WHEN random() < 0.3
       THEN 1001 + floor(random()*5)::int
       ELSE 1 + floor(random()*300000)::int END,
  1 + floor(random()*150000)::int,
  ts.t,
  CASE WHEN random() < 0.15 THEN ts.t + (random() * interval '3 days') END
FROM (
  SELECT TIMESTAMPTZ '2026-06-24 00:00:00+08' + (random() * interval '24 hours') AS t
  FROM generate_series(1, 30000)
) ts;

-- STEP: 購買方案 + 購買紀錄 40 萬
INSERT INTO credit_packages (name, credit_amount, price) VALUES
  ('體驗包',     1,   300),
  ('7 堂組合包', 7,  1400),
  ('14 堂組合包',14, 2520),
  ('30 堂年度包',30, 4800),
  ('企業 50 堂包',50, 7000);

INSERT INTO credit_purchases (user_id, credit_package_id, purchased_credits, price_paid, purchase_at)
SELECT
  p.uid,
  p.pid,
  (ARRAY[1,7,14,30,50])[p.pid],
  (ARRAY[300,1400,2520,4800,7000])[p.pid],
  TIMESTAMPTZ '2026-07-24 18:00:00+08' - (random() * interval '90 days')
FROM (
  SELECT 1 + floor(random()*300000)::int AS uid,
         1 + floor(random()*5)::int      AS pid
  FROM generate_series(1, 400000)
) p;

-- STEP: 金流訂單 45 萬（口徑鐵律：每筆成交購買都有一張 paid 訂單）
INSERT INTO orders (user_id, amount, payment_status, created_at, paid_at)
SELECT user_id, price_paid, 'paid', purchase_at, purchase_at
FROM credit_purchases;

INSERT INTO orders (user_id, amount, payment_status, created_at, paid_at)
SELECT
  1 + floor(random()*300000)::int,
  (ARRAY[300,1400,2520,4800,7000])[1 + floor(random()*5)::int],
  (ARRAY['unpaid','failed'])[1 + floor(random()*2)::int],
  TIMESTAMPTZ '2026-07-24 18:00:00+08' - (random() * interval '90 days'),
  NULL
FROM generate_series(1, 50000);

-- 故事收線：Jack Pai 在辦案關卡單的那筆 9000，金流組追回來了
INSERT INTO orders (user_id, amount, payment_status, created_at, paid_at) VALUES
  (2, 9000, 'paid', TIMESTAMPTZ '2026-06-20 20:20:00+08', TIMESTAMPTZ '2026-06-28 10:00:00+08');

-- STEP: 前任值班留下的索引（交接備註：「created_at 的索引我早就加了」）
CREATE INDEX idx_bookings_created ON course_bookings (created_at);

-- STEP: 更新統計資訊
ANALYZE;
