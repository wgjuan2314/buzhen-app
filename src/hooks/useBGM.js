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

  const startBGM = () => {
    if (!audioRef.current || isMuted) return
    
    if (!isLoaded) {
      // 如果還沒載入，等待載入完成後再播放
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
    
    audioRef.current.play().catch(() => {})
    fadeIn()
  }

  return {
    isMuted,
    toggleMute,
    startBGM,
    isLoaded,
  }
}
