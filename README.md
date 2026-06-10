# 🚑 W7 效能急救室 — LiveFit 爆紅了

![驗收狀態](https://github.com/你的帳號/你的repo/actions/workflows/test.yml/badge.svg)

> 上回你查完帳（還記得 Jack Pai 那筆卡單嗎），這回輪你值班。
> LiveFit 爆紅了——你第一次拿到**正式資料庫**的連線權限：30 萬會員、超過 100 萬筆報名。
> 你在 PostgreSQL Gym 練的招式都是真的，只是現在的世界大了一萬倍。
>
> 前任值班工程師留下六張效能工單和一句話：「接力給你了，準時下班。」

（之前在 Gym 練習用的是去識別化的證物切片；這顆正式庫有三年的歷史資料——爆紅前整張 courses 還不到一萬筆，**資料量才是索引存在的理由**。）

## 🚀 快速開始

1. 安裝並啟動 [Docker Desktop](https://www.docker.com/products/docker-desktop/)；Node.js >= 20
2. **Fork** 本專案 → clone 你的 fork →
   進你 repo 的 **Actions** tab 按一次「enable workflows」

```bash
cp .env.example .env
npm install
npm start              # 起 LiveFit 正式資料庫（Docker 電器，原理 W10 教）
npm run seed           # 灌入 130 萬筆正式資料（約 10~30 秒，全班資料一模一樣）
npm run measure        # 😱 看災情
```

**成功長什麼樣**：measure 印出六張工單的生命徵象，一片紅燈。

## 🎫 六張工單

| # | 營運的抱怨 | ⭐ |
|---|---|---|
| 1 | 客服輸入會員 email 要等好幾秒，客人都掛電話了（**課堂示範過**）| ⭐ |
| 2 | 企業戶「喵喵物流」反映：打開團課課表要轉好久 | ⭐⭐ |
| 3 | 後台首頁的最新 100 筆購買紀錄，每次進來都卡 | ⭐⭐ |
| 4 | 首頁「進行中課程」越來越慢。上一位工程師幫 start_at 加過索引也沒用，後來刪掉了 | ⭐⭐⭐ |
| 5 | 「上週開課課程」的教練報名統計報表，慢到大家都去倒咖啡（至少兩個病灶）| ⭐⭐⭐ |
| 6 | **前任交接**：created_at 的索引我早就加了，但查 6/24 週年慶那天的報名還是超慢。⚠️ 這張**不准再加任何索引**——改寫 `queries/06-rewrite.sql` | ⭐⭐⭐ |
| 加分 | 99% 的課表查詢只看「未取消」——能不能讓工單 2 的索引更小更準？（partial index）| ⭐ |

工單的完整查詢都在 `scripts/tickets.js`（唯讀），ERD 資料表地圖在 `docs/`。

## 🔁 救一張工單的迴圈

```bash
npm run measure 4                  # 只量這張，確認病人狀態
# 在 DBeaver / psql 跑 EXPLAIN ANALYZE <工單查詢>，找病因：
#   ① 找最深層的 Seq Scan ② 看它 Filter 砍掉幾列 ③ 對回 WHERE/JOIN 的哪個欄位
# 把解法寫進 optimize.sql（工單 6 是改寫 queries/06-rewrite.sql）
npm run optimize
npm run measure 4                  # 🟢 收工換下一張
```

**燈號**：🔴 全表掃描｜🟡 吃到索引但還能更準（看 Rows Removed）｜🟢 結案。
判定看的是**執行計畫**不是秒數——你電腦再慢，對了就是綠。

## 🧪 驗收與繳交

```bash
npm test    # 九條驗收，全綠才算結案
```

push 後 Actions 跑同一套驗收（**通過標準：全綠**），結果總表在 run 的 Summary 頁。

**繳交**：repo 網址（Actions 全綠）+ 一張 measure 全綠「準時下班」的截圖。

> 📏 考卷規則：`scripts/`、`test/`、`.github/` 不可修改；你動的只有 `optimize.sql` 和 `queries/06-rewrite.sql`。繳交後會用原版抽查重跑，改考卷以 0 分計。

## ❓ FAQ

**Q：measure 紅的，但我明明加了索引？**
跑 `EXPLAIN ANALYZE` 看計畫——索引「存在」不等於「被用」。常見原因：條件欄位不對、函式包住欄位（工單 6）、或這個條件砍不掉幾列所以資料庫不屑用（工單 4 的故事）。

**Q：🟡 黃燈是什麼意思？**
吃到索引了，但取回來的列大部分又被丟掉（Rows Removed 很大）——索引可以更準，想想**複合索引**，或者你舊的單欄索引還掛著沒 DROP（資料庫可能還在用舊的）。

**Q：`npm run seed` 可以重跑嗎？**
可以，隨時砍掉重練；`npm run db:reset` 連資料庫一起重開。種子是固定亂數，重種一百次都長一樣。

**Q：工單 6 為什麼不准加索引？**
因為它考的就是「索引救不了你」的情況——查詢寫法讓現有索引失效。順帶一提：你就算想對 `DATE(created_at)` 建索引，PostgreSQL 也會拒絕你（時區函式不是 IMMUTABLE）——自己試試看那個錯誤訊息，這也是課。

**Q：5432 被我電腦上別的東西占住了？**
改 `.env` 的 `DB_PORT`（例如 5433），`npm run db:reset` 重起就好——compose 跟所有腳本都吃這個值。
