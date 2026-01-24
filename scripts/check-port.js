#!/usr/bin/env node

/**
 * 檢查並釋放指定端口
 * 運行方式：node scripts/check-port.js [端口號]
 */

import { execSync } from 'child_process'

const port = process.argv[2] || '5173'

console.log(`\n🔍 檢查端口 ${port} 的占用情況...\n`)

try {
  // 查找占用端口的進程
  const result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8', stdio: 'pipe' })
  const pids = result.trim().split('\n').filter(Boolean)

  if (pids.length === 0) {
    console.log(`✅ 端口 ${port} 未被占用\n`)
    process.exit(0)
  }

  console.log(`⚠️  發現 ${pids.length} 個進程占用端口 ${port}：`)
  
  // 顯示進程詳情
  for (const pid of pids) {
    try {
      const processInfo = execSync(`ps -p ${pid} -o comm=,args=`, { encoding: 'utf-8' })
      console.log(`   PID: ${pid} - ${processInfo.trim()}`)
    } catch (e) {
      console.log(`   PID: ${pid} - (進程信息無法獲取)`)
    }
  }

  console.log('\n❓ 是否要終止這些進程？(y/N)')
  
  // 如果是非交互式環境，跳過確認
  if (!process.stdin.isTTY) {
    console.log('   非交互式環境，跳過自動終止\n')
    process.exit(1)
  }

  // 等待用戶輸入
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  process.stdin.once('data', (key) => {
    process.stdin.setRawMode(false)
    process.stdin.pause()

    if (key.toLowerCase() === 'y' || key.toLowerCase() === '\r') {
      console.log('\n🔄 正在終止進程...\n')
      
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'inherit' })
          console.log(`✅ 已終止進程 ${pid}`)
        } catch (e) {
          console.log(`❌ 無法終止進程 ${pid}: ${e.message}`)
        }
      }
      
      console.log(`\n✅ 端口 ${port} 已釋放\n`)
      process.exit(0)
    } else {
      console.log('\n⏭️  跳過終止進程\n')
      process.exit(1)
    }
  })
} catch (e) {
  // lsof 命令沒有找到占用端口的進程
  if (e.status === 1) {
    console.log(`✅ 端口 ${port} 未被占用\n`)
    process.exit(0)
  } else {
    console.error(`❌ 檢查端口時出錯: ${e.message}\n`)
    process.exit(1)
  }
}
