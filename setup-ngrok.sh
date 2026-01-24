#!/bin/bash

# Ngrok 配置腳本
# 用於配置 Ngrok Auth Token

echo "🔐 Ngrok Auth Token 配置"
echo "========================"
echo ""
echo "請按照以下步驟獲取你的 Auth Token："
echo ""
echo "1. 訪問：https://dashboard.ngrok.com/get-started/your-authtoken"
echo "2. 如果沒有賬號，請先註冊（可使用 GitHub/Google 登錄）"
echo "3. 登錄後複製你的 Auth Token"
echo ""
echo "提示：Auth Token 格式類似：2abc123def456ghi789jkl012mno345pq_6r7s8t9u0v1w2x3y4z5"
echo ""
read -p "請輸入你的 Ngrok Auth Token: " AUTH_TOKEN

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ 錯誤：Auth Token 不能為空"
    exit 1
fi

echo ""
echo "正在配置 Ngrok..."
echo ""

# 使用 npx 配置 auth-token
npx ngrok config add-authtoken "$AUTH_TOKEN"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Ngrok 配置成功！"
    echo ""
    echo "下一步："
    echo "1. 確保開發服務器正在運行：npm run dev"
    echo "2. 運行啟動腳本：./start-ngrok.sh"
    echo "   或直接運行：npx ngrok http 5173"
else
    echo ""
    echo "❌ 配置失敗，請檢查："
    echo "   - Auth Token 是否正確"
    echo "   - 網絡連接是否正常"
    echo "   - 是否已安裝 Node.js 和 npm"
fi
