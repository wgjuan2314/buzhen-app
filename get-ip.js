#!/usr/bin/env node

/**
 * 獲取當前機器的局域網 IP 地址
 * 運行方式：node get-ip.js
 */

import { networkInterfaces } from 'os'
import { execSync } from 'child_process'

function getLocalIP() {
  try {
    const interfaces = networkInterfaces()
    
    if (!interfaces) {
      throw new Error('無法獲取網絡接口信息')
    }

    const addresses = []

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // 跳過內部（非 IPv4）和非外部地址（即 127.0.0.1 和 ::1）
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push({
            interface: name,
            address: iface.address,
          })
        }
      }
    }

    // 優先返回非 169.254.x.x（鏈路本地地址）的 IP
    const preferredIP = addresses.find(addr => !addr.address.startsWith('169.254.'))
    
    return preferredIP || addresses[0] || null
  } catch (error) {
    // 如果 networkInterfaces() 失敗，嘗試使用系統命令（macOS）
    try {
      const result = execSync('ifconfig | grep "inet " | grep -v 127.0.0.1 | awk \'{print $2}\' | head -1', {
        encoding: 'utf-8',
        stdio: 'pipe'
      })
      const ip = result.trim()
      if (ip) {
        return {
          interface: 'auto-detected',
          address: ip
        }
      }
    } catch (e) {
      // 忽略錯誤，繼續返回 null
    }
    return null
  }
}

const ipInfo = getLocalIP()

if (ipInfo) {
  console.log('\n🌐 局域網 IP 地址：')
  console.log(`   ${ipInfo.address}`)
  console.log(`   網絡接口：${ipInfo.interface}`)
  console.log(`\n📱 手機訪問地址：`)
  console.log(`   http://${ipInfo.address}:5173`)
  console.log('')
} else {
  console.error('\n❌ 無法自動獲取局域網 IP 地址')
  console.log('\n💡 請手動運行以下命令獲取 IP：')
  console.log('   macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1')
  console.log('   Windows: ipconfig | findstr IPv4')
  console.log('')
  process.exit(1)
}
