import { useRef, useEffect, useState } from 'react'

/**
 * 全局背景音管理 Hook
 * 支援淡入淡出（1秒）與靜音切換
 */
export function useBGM(src = '/assets/bgm.mp3') {
  const audioRef = useRef(null)
  const fadeIntervalRef = useRef(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = 0.1 // 強制壓低 BGM：直接設置為 0.1，確保它只是若有若無的背景板

    audio.addEventListener('loadeddata', () => {
      setIsLoaded(true)
      // 自動開始播放（需要用戶交互後才能播放，所以這裡只是準備）
      audio.play().catch(() => {
        // 瀏覽器可能阻止自動播放，需要用戶交互
      })
    })

    audioRef.current = audio

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
      }
      audio.pause()
      audio.src = ''
    }
  }, [src])

  const fadeIn = () => {
    if (!audioRef.current || !isLoaded) return

    const audio = audioRef.current
    const targetVolume = 0.1 // 背景音音量：10%，若有若無的背景板
    const duration = 1000 // 1秒
    const steps = 20
    const stepTime = duration / steps
    const volumeStep = targetVolume / steps

    let currentStep = 0

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
    }

    fadeIntervalRef.current = setInterval(() => {
      currentStep++
      audio.volume = Math.min(volumeStep * currentStep, targetVolume)

      if (currentStep >= steps) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
    }, stepTime)
  }

  const fadeOut = () => {
    if (!audioRef.current) return

    const audio = audioRef.current
    const duration = 1000 // 1秒
    const steps = 20
    const stepTime = duration / steps
    const initialVolume = audio.volume
    const volumeStep = initialVolume / steps

    let currentStep = 0

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
    }

    fadeIntervalRef.current = setInterval(() => {
      currentStep++
      audio.volume = Math.max(initialVolume - volumeStep * currentStep, 0)

      if (currentStep >= steps) {
        audio.pause()
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
    }, stepTime)
  }

  const toggleMute = () => {
    if (!audioRef.current || !isLoaded) return

    const newMuted = !isMuted
    setIsMuted(newMuted)

    if (newMuted) {
      fadeOut()
    } else {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => {})
      }
      fadeIn()
    }
  }

  /**
   * 熱身：提前激活音頻上下文，不等待載入完成
   * 這在用戶點擊"入梦"按鈕時調用，用於解鎖移動端音頻權限
   */
  const warmup = () => {
    if (!audioRef.current) return
    
    // 立即嘗試播放，即使未載入完成
    // 這會觸發瀏覽器開始加載音頻，並激活音頻上下文
    audioRef.current.play().catch((error) => {
      // 忽略錯誤，因為這只是"熱身"，可能音頻還沒載入完成
      console.log('[useBGM] 熱身播放嘗試（可能音頻未載入）:', error.message)
    })
    
    console.log('[useBGM] 音頻熱身完成')
  }

  const startBGM = () => {
    if (!audioRef.current) return
    
    // 如果已靜音，不啟動
    if (isMuted) {
      console.log('[useBGM] 當前已靜音，跳過啟動')
      return
    }
    
    // 如果還沒載入，先嘗試播放觸發載入，然後等待載入完成
    if (!isLoaded) {
      // 立即嘗試播放（觸發載入）
      audioRef.current.play().catch(() => {
        // 忽略錯誤，繼續等待載入
      })
      
      // 等待載入完成後再淡入
      const checkLoaded = setInterval(() => {
        if (isLoaded && audioRef.current && !isMuted) {
          audioRef.current.play().catch(() => {})
          fadeIn()
          clearInterval(checkLoaded)
        }
      }, 100)
      
      // 設置超時，避免無限等待
      setTimeout(() => clearInterval(checkLoaded), 5000)
      return
    }
    
    // 已載入，直接播放並淡入
    audioRef.current.play().catch((error) => {
      console.warn('[useBGM] 播放失敗:', error.message)
    })
    fadeIn()
  }

  return {
    isMuted,
    toggleMute,
    startBGM,
    warmup,
    isLoaded,
  }
}
