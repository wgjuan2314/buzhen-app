# 🚀 Ngrok 快速啟動指南

## ⚡ 三步快速開始

### 步驟 1：獲取 Auth Token（只需一次）

1. 訪問：https://dashboard.ngrok.com/get-started/your-authtoken
2. 登錄或註冊賬號
3. 複製你的 Auth Token

### 步驟 2：配置 Auth Token（只需一次）

在終端運行以下命令（替換 `YOUR_AUTH_TOKEN` 為你複製的 token）：

```bash
cd /Users/suansuan/Desktop/buzhen-h5/buzhen-app
npx ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 步驟 3：啟動 Ngrok

確保開發服務器正在運行（`npm run dev`），然後在新終端運行：

```bash
cd /Users/suansuan/Desktop/buzhen-h5/buzhen-app
npx ngrok http 5173
```

---

## 📱 手機訪問

1. Ngrok 會顯示一個 HTTPS 地址，例如：`https://abc123.ngrok-free.app`
2. 在手機瀏覽器中打開這個地址
3. 如果看到安全警告，點擊「Visit Site」繼續

---

## 🔍 查看請求日誌

訪問：http://127.0.0.1:4040

---

## 💡 提示

- 每次重啟 ngrok 會獲得新的地址
- 免費版有連接時長限制
- 開發服務器必須在運行（端口 5173）
