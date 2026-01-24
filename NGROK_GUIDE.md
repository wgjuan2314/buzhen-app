# Ngrok 手機公網預覽指南

## 📋 快速開始

### 步驟 1：安裝 Ngrok（選擇一種方式）

#### 方式 A：使用 npm（推薦，無需管理員權限）
```bash
# 使用 npx 直接運行，無需全局安裝
# 第一次運行時會自動下載
npx ngrok --version
```

#### 方式 B：使用 Homebrew（需要先安裝 Homebrew）
```bash
# 安裝 Homebrew（如果還沒有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝 ngrok
brew install ngrok/ngrok/ngrok
```

#### 方式 C：手動下載安裝
1. 訪問：https://ngrok.com/download
2. 選擇 macOS 版本下載
3. 解壓後將 `ngrok` 移動到 `/usr/local/bin/` 或添加到 PATH

---

### 步驟 2：獲取並配置 Auth Token

#### 2.1 註冊 Ngrok 賬號
1. 訪問：https://dashboard.ngrok.com/signup
2. 使用 GitHub/Google 登錄或創建新賬號

#### 2.2 獲取 Auth Token
1. 登錄後訪問：https://dashboard.ngrok.com/get-started/your-authtoken
2. 複製你的 Auth Token（類似：`2abc123def456ghi789jkl012mno345pq_6r7s8t9u0v1w2x3y4z5`）

#### 2.3 配置 Auth Token
在終端運行：
```bash
# 如果使用 npx（推薦）
npx ngrok config add-authtoken YOUR_AUTH_TOKEN

# 如果全局安裝了 ngrok
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

將 `YOUR_AUTH_TOKEN` 替換為你複製的 token。

---

### 步驟 3：啟動開發服務器

```bash
cd /Users/suansuan/Desktop/buzhen-h5/buzhen-app
npm run dev
```

開發服務器會在 `http://localhost:5173` 啟動。

---

### 步驟 4：啟動 Ngrok 穿透

#### 方式 A：使用提供的腳本（推薦）
```bash
cd /Users/suansuan/Desktop/buzhen-h5/buzhen-app
chmod +x start-ngrok.sh
./start-ngrok.sh
```

#### 方式 B：手動運行命令
打開**新的終端窗口**，運行：
```bash
# 使用 npx（無需全局安裝）
npx ngrok http 5173

# 或如果全局安裝了 ngrok
ngrok http 5173
```

---

### 步驟 5：獲取公網地址

Ngrok 會顯示類似以下的信息：
```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:5173
```

**複製 `Forwarding` 行中的 HTTPS 地址**（例如：`https://abc123def456.ngrok-free.app`）

---

### 步驟 6：手機訪問

1. **確保手機和電腦連接到同一網絡**（或手機使用移動數據）
2. **在手機瀏覽器中打開** Ngrok 提供的 HTTPS 地址

#### 🔒 處理「安全警告」頁面

如果看到 Ngrok 的警告頁面：
1. 點擊 **「Visit Site」** 或 **「繼續訪問」** 按鈕
2. 某些瀏覽器可能需要：
   - 點擊 **「Advanced」**（高級選項）
   - 然後點擊 **「Proceed to [your-site]」**（繼續訪問）
3. 這是正常的安全提示，因為使用的是免費版 Ngrok

---

## 🔍 調試和監控

### 查看請求日誌

Ngrok 提供了一個 Web 界面來查看所有請求：
- 訪問：`http://127.0.0.1:4040`
- 可以看到所有進出請求的詳細信息、狀態碼、響應時間等

### 常見問題排查

#### 1. 連接失敗
- ✅ 確認開發服務器正在運行（`npm run dev`）
- ✅ 確認 Ngrok 指向正確的端口（5173）
- ✅ 檢查終端是否有錯誤信息

#### 2. 頁面加載但資源失敗
- ✅ 檢查瀏覽器控制台的錯誤信息
- ✅ 確認 Vite 配置正確
- ✅ 檢查網絡連接

#### 3. API 請求失敗
- ✅ 檢查代理配置（`/api` 和 `/minimax-api`）
- ✅ 確認後端服務可訪問
- ✅ 查看 Ngrok Web 界面（4040端口）的請求日誌

#### 4. Ngrok 連接中斷
- ✅ 免費版有連接時長限制，重新運行 `ngrok http 5173` 即可
- ✅ 每次重啟會獲得新的地址

---

## 📝 快速命令總結

```bash
# 1. 配置 auth-token（只需執行一次）
npx ngrok config add-authtoken YOUR_AUTH_TOKEN

# 2. 啟動開發服務器（終端 1）
cd /Users/suansuan/Desktop/buzhen-h5/buzhen-app
npm run dev

# 3. 啟動 Ngrok（終端 2）
npx ngrok http 5173

# 4. 複製 HTTPS 地址到手機瀏覽器訪問
```

---

## 💡 提示

- **免費版限制**：每次重啟 ngrok 會獲得新的隨機地址
- **付費版優勢**：可以使用固定域名、更多並發連接等
- **安全建議**：不要在生產環境使用免費版 ngrok
- **性能**：免費版有帶寬限制，適合開發測試使用

---

## 🆘 需要幫助？

如果遇到問題：
1. 檢查終端錯誤信息
2. 訪問 Ngrok Web 界面：http://127.0.0.1:4040
3. 查看 Ngrok 文檔：https://ngrok.com/docs
