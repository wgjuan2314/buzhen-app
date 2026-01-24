# 🌐 網絡診斷工具 - 快速參考

## ✅ 已完成的配置

### 1. IP 地址檢測腳本 ✅
- **文件**：`get-ip.js`
- **用法**：`npm run get-ip` 或 `node get-ip.js`
- **功能**：自動檢測並顯示局域網 IP 地址

### 2. 二維碼插件配置 ✅
- **插件**：`vite-plugin-qrcode`
- **配置**：已添加到 `vite.config.js`
- **功能**：啟動開發服務器時自動顯示二維碼

### 3. 端口檢查腳本 ✅
- **文件**：`scripts/check-port.js`
- **用法**：`npm run check-port` 或 `npm run free-port`
- **功能**：檢查並釋放被占用的端口

---

## 🚀 立即使用

### 第一步：安裝依賴
```bash
npm install -D vite-plugin-qrcode
```

### 第二步：啟動開發服務器
```bash
npm run dev
```

啟動後會自動顯示：
- 📱 二維碼（掃碼訪問）
- 🌐 本地地址
- 📡 局域網地址

### 第三步：獲取 IP（如果需要）
```bash
npm run get-ip
```

### 第四步：檢查端口（如果端口被占用）
```bash
npm run check-port
```

---

## 📋 所有可用命令

```bash
# 啟動開發服務器（帶二維碼）
npm run dev

# 獲取局域網 IP
npm run get-ip

# 檢查端口占用
npm run check-port

# 釋放 5173 端口
npm run free-port
```

---

## 📱 手機訪問

1. **掃描二維碼**（推薦）
   - 運行 `npm run dev`
   - 在終端掃描顯示的二維碼

2. **手動輸入 IP**
   - 運行 `npm run get-ip` 獲取 IP
   - 在手機瀏覽器輸入：`http://你的IP:5173`

---

## ⚙️ 配置說明

### vite.config.js
- ✅ `host: '0.0.0.0'` - 允許局域網訪問
- ✅ `port: 5173` - 開發服務器端口
- ✅ `vite-plugin-qrcode` - 二維碼插件

### package.json
- ✅ 添加了 `get-ip` 腳本
- ✅ 添加了 `check-port` 腳本
- ✅ 添加了 `free-port` 腳本

---

詳細說明請查看：`NETWORK_SETUP.md`
