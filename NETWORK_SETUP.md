# 🌐 網絡診斷和配置指南

## 📋 功能說明

本項目已配置以下網絡診斷和優化功能：

1. **IP 地址檢測**：快速獲取局域網 IP
2. **二維碼訪問**：啟動時自動顯示二維碼，手機掃碼即可訪問
3. **端口檢查**：自動檢測並釋放被占用的端口

---

## 🚀 快速開始

### 步驟 1：安裝依賴

首先安裝二維碼插件（如果還沒安裝）：

```bash
cd /Users/suansuan/Desktop/buzhen-h5/buzhen-app
npm install
```

或者單獨安裝二維碼插件：

```bash
npm install -D vite-plugin-qrcode
```

### 步驟 2：檢查並釋放端口（可選）

如果端口 5173 被占用，運行：

```bash
npm run check-port
```

或者直接指定端口：

```bash
npm run free-port
```

### 步驟 3：獲取 IP 地址

查看當前局域網 IP：

```bash
npm run get-ip
```

或者直接運行：

```bash
node get-ip.js
```

### 步驟 4：啟動開發服務器

```bash
npm run dev
```

啟動後，終端會自動顯示：
- ✅ 二維碼（手機掃碼即可訪問）
- ✅ 本地訪問地址
- ✅ 局域網訪問地址

---

## 📱 手機訪問方式

### 方式 1：掃描二維碼（推薦）

1. 運行 `npm run dev`
2. 在終端中找到顯示的二維碼
3. 使用手機掃描二維碼
4. 自動打開瀏覽器訪問

### 方式 2：手動輸入 IP

1. 運行 `npm run get-ip` 獲取 IP
2. 在手機瀏覽器輸入：`http://你的IP:5173`
3. 例如：`http://192.168.1.100:5173`

---

## 🛠️ 可用腳本

| 腳本 | 說明 |
|------|------|
| `npm run get-ip` | 顯示當前局域網 IP 地址 |
| `npm run check-port` | 檢查端口占用情況（默認 5173） |
| `npm run free-port` | 檢查並釋放 5173 端口 |
| `npm run dev` | 啟動開發服務器（帶二維碼） |

---

## 🔧 手動檢查端口

如果需要檢查其他端口：

```bash
node scripts/check-port.js 3000
```

---

## ⚠️ 常見問題

### 1. 二維碼不顯示？

- 確保已安裝 `vite-plugin-qrcode`：`npm install -D vite-plugin-qrcode`
- 檢查終端是否支持 Unicode 字符
- 嘗試使用 `npm run get-ip` 手動獲取 IP

### 2. 手機無法訪問？

- 確保手機和電腦在同一局域網
- 檢查防火牆設置
- 確認 Vite 配置中 `host: '0.0.0.0'` 已設置
- 嘗試使用 `npm run get-ip` 確認 IP 地址

### 3. 端口被占用？

- 運行 `npm run check-port` 查看占用進程
- 選擇 `y` 自動終止占用進程
- 或手動終止：`kill -9 <PID>`

### 4. IP 地址獲取失敗？

- 確保已連接到局域網
- 檢查網絡接口是否正常
- 嘗試手動查看：`ifconfig` (macOS/Linux) 或 `ipconfig` (Windows)

---

## 📝 配置文件說明

### vite.config.js

已配置：
- ✅ `host: '0.0.0.0'` - 允許局域網訪問
- ✅ `port: 5173` - 開發服務器端口
- ✅ `vite-plugin-qrcode` - 二維碼插件

### package.json

已添加腳本：
- `get-ip` - IP 地址檢測
- `check-port` - 端口檢查
- `free-port` - 釋放端口

---

## 💡 提示

- 每次啟動開發服務器時，二維碼會自動顯示在終端
- IP 地址可能會變化，建議使用二維碼掃描
- 如果使用 VPN，可能會影響局域網訪問
- 某些企業網絡可能限制設備間通信

---

## 🆘 需要幫助？

如果遇到問題：
1. 檢查終端錯誤信息
2. 運行 `npm run get-ip` 確認 IP
3. 運行 `npm run check-port` 檢查端口
4. 查看 Vite 啟動日誌
