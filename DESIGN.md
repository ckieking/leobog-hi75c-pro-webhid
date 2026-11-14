# LEOBOG Hi75C Pro WebHID 設計系統（DESIGN.md）

本文件紀錄 LEOBOG Hi75C Pro WebHID 網頁設定工作站的介面架構、視覺風格規範與實作代幣。所有設計決策皆對應實際硬體操作需求（75% 81 鍵 + K82 旋鈕編碼器、雙層改鍵與 Per-Key RGB），並遵循 **True-Black Flat** 風格契約。

## 1. 視覺定位與方向契約（Direction Contract）

- **視覺路線**：`true-black-flat`（純黑平面工作站，無 CSS 漸層、無靜態陰影、無毛玻璃模糊）。
- **結構原型**：三欄式高密度硬體作業台（左側工具列、中央 CNC 機身藍圖與遙測條、右側檢查器）。
- **核心強調色比例**：Acid Lime（`#c6f24e`）僅限於高訊號狀態徽章、選取鍵位外框、待儲存標記點與作用中層別切換，整體畫面佔比維持在 3% 以下，不用於一般導覽或裝飾性元件。
- **反轉式主行動鍵**：連線按鈕（`Connect`）與套用寫入按鈕（`Apply`）採用高對比純白反轉膠囊（`#ffffff` 背景、`#000000` 文字、`999px` 圓角）。

## 2. 色彩與平面階層系統

| Token | 色碼 | 用途說明 |
| --- | --- | --- |
| `--ground` | `#000000` | 全域純黑畫布基底 |
| `--surface` | `#111111` | 主要區域面板（左側工具列、頂部標題列、遙測列、舞臺面板、檢查器卡片） |
| `--surface-chassis` | `#181818` | Hi75C Pro AL6063 CNC 鍵盤鋁合金外殼與控制項底層 |
| `--keycap-skirt` | `#222222` | 字母區鍵帽下緣階梯裙邊 |
| `--keycap-mod-skirt` | `#1c1c1c` | 修飾鍵與機能鍵區鍵帽裙邊 |
| `--raised` | `#2a2a2a` | 鍵帽頂面階梯、啟用中背景 |
| `--keycap-mod-dish` | `#242424` | 修飾鍵鍵帽頂面 |
| `--border` / `--rule` | `#1a1a1a` / `#161616` | 低對比度結構分隔線 |
| `--accent` | `#c6f24e` | Acid Lime 狀態高亮、作用鍵位外框、變更點、同步完成標誌 |
| `--negative` / `--pill-neg-*` | `#e5484d` / `#2c1a20` | 錯誤警告（WebHID 不支援、連線／寫入錯誤） |
| `--warning` / `--pill-warn-*` | `#e5a93b` / `#2b2414` | 休眠待機提示、遺失 Fn 鍵保護提示、佇列等待狀態 |

## 3. 字體排印與技術數據規格

- **主字體**：`Inter`（400 / 500 / 600）搭配系統繁體中文黑體降級（`Noto Sans TC`, `Microsoft JhengHei`）。於 `.impeccable/config.json` 記錄來自設計方向生成器之字體授權豁免。
- **等寬數值標記**：所有 USB VID/PID（`0x3554:0xFA09`）、鍵位矩陣編號（`K82 · #84`）、4-Byte HID 十六進位碼與電量百分比，皆採用原生 `<code>` 與 `<kbd>` 標籤搭配 `ui-monospace` 與 `tabular-nums`，不自定義全域 monospace 工具類別。
- **文字大小級距**：
  - 主標題 `<h1>`：`19px`（字重 600、`letter-spacing: -0.02em`）
  - 檢查器副標題：`15px`
  - 遙測數值、`<body>`：`14px`
  - 控制項、鍵帽銘文、狀態徽章、欄位標籤：`13px`
  - 機身 CNC 刻字、充電標籤與嵌入式技術代碼：`12px`

## 4. 三欄工作站佈局與響應式策略

- **左側工具列（`.icon-rail`）**：桌面版寬度 `56px` 固定吸附左側，容納改鍵、燈效、K82 旋鈕直達按鈕、設定檔匯出／匯入、語系切換與右側檢查器摺疊開關。視窗寬度 `<= 760px` 時自動摺疊為 `52px` 底部固定橫向導覽列（主欄加上 `72px` 下邊距防止遮蔽）。
- **四格分割即時遙測條（`.telemetry-strip`）**：以細線垂直分隔呈現目前作用層別（Base / Fn1）、K82 旋鈕當前功能、燈效亮度，並將草稿變更計數與「還原／儲存套用」動作直接整合於第四格，免除額外浮動橫幅佔用首屏垂直空間。
- **CNC 硬體鍵盤舞臺（`KeyboardVisual.tsx`）**：透過 `ResizeObserver` 即時依容器寬度縮放邏輯尺寸 `901 × 396 px` 機身，保留四角六角螺絲 SVG、AL6063 CNC 規格銘文與雙層立體鍵帽視覺；`K82` 採用客製 SVG 滾花刻度錶盤（`IconKnobDial`）。所有鍵帽銘文經 `formatKeycodeLabel(..., true)` 與 `COMPACT_LEGEND_MAP` 精簡處理，確保 1u 窄鍵清晰不截斷。
- **右側檢查器（`KeymapInspector.tsx`、`LightingPanel.tsx`）**：桌面版寬度 `368px`，內部讀取區採水平底線分割（不嵌套圓角子卡片）；螢幕寬度 `<= 1180px` 時自動下堆疊於鍵盤舞臺下方。

## 5. 圖示與圓角規範

- **全站 SVG 規範**：一律使用 `src/components/Icons.tsx` 提供的 1.5px 統一筆觸向量圖示，全面禁止 Unicode 繪文字（Emoji）。
- **圓角收斂（三階規範）**：面板與鍵盤鋁殼統一 `16px`，鍵帽與輸入框統一 `8px`，操作膠囊與指示徽章／旋鈕統一 `999px`。
- **無障礙對焦狀態**：所有按鈕、滑桿與選取項提供 `aria-pressed` / `aria-label` / `aria-checked`，並以 `outline: 2px solid #c6f24e; outline-offset: 2px;` 作為鍵盤對焦框，保持零 `box-shadow` 原則。
