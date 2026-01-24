#!/bin/bash

# Ngrok 啟動腳本
# 用於將本地開發服務器（端口 5173）暴露到公網

echo "🚀 正在啟動 Ngrok..."
echo "📡 本地端口: 5173"
echo ""

# 檢查端口是否在運行
if ! lsof -ti:5173 > /dev/null 2>&1; then
    echo "❌ 錯誤：端口 5173 沒有服務在運行"
    echo "請先運行: npm run dev"
    exit 1
fi

# 使用 npx 運行 ngrok（無需全局安裝）
echo "✅ 開發服務器正在運行"
echo "🌐 正在啟動 Ngrok 穿透..."
echo ""
echo "📝 提示："
echo "   1. 如果這是第一次使用，需要先配置 auth-token"
echo "   2. 訪問 https://dashboard.ngrok.com/get-started/your-authtoken 獲取 token"
echo "   3. 然後運行: npx ngrok config add-authtoken YOUR_TOKEN"
echo ""

# 啟動 ngrok
npx ngrok http 5173
