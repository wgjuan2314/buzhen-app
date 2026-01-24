import { useState, useEffect } from 'react'

/**
 * 判斷當前時間模式（晝/夜）
 * 06:00-18:00 為晝，其餘為夜
 */
export function useTimeMode() {
  const [isDay, setIsDay] = useState(() => {
    const now = new Date()
    const hour = now.getHours()
    return hour >= 6 && hour < 18
  })

  useEffect(() => {
    const updateTimeMode = () => {
      const now = new Date()
      const hour = now.getHours()
      setIsDay(hour >= 6 && hour < 18)
    }

    // 立即更新一次
    updateTimeMode()

    // 每分鐘檢查一次（避免頻繁更新）
    const interval = setInterval(updateTimeMode, 60000)

    // 計算到下一個切換點的時間
    const now = new Date()
    const nextSwitch = new Date(now)
    const hour = now.getHours()

    if (hour < 6) {
      // 當前是夜，下一個切換點是 06:00
      nextSwitch.setHours(6, 0, 0, 0)
    } else if (hour < 18) {
      // 當前是晝，下一個切換點是 18:00
      nextSwitch.setHours(18, 0, 0, 0)
    } else {
      // 當前是夜，下一個切換點是明天 06:00
      nextSwitch.setDate(nextSwitch.getDate() + 1)
      nextSwitch.setHours(6, 0, 0, 0)
    }

    const timeout = setTimeout(() => {
      updateTimeMode()
      // 切換後重新設置定時器
      const newInterval = setInterval(updateTimeMode, 60000)
      return () => clearInterval(newInterval)
    }, nextSwitch.getTime() - now.getTime())

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  return { isDay, isNight: !isDay }
}
