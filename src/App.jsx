import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import LandingPage from './components/LandingPage'
import ChatPage from './components/ChatPage'
import GlobalClickEffect from './components/GlobalClickEffect'
import { useBGM } from './hooks/useBGM'
import { useTimeMode } from './hooks/useTimeMode'

export default function App() {
  const [showChat, setShowChat] = useState(false)
  const chatPageRef = useRef(null)
  const videoRef = useRef(null)
  const { isMuted, toggleMute, startBGM, isLoaded } = useBGM()
  const { isDay } = useTimeMode()

  // 用戶首次交互後啟動 BGM
  useEffect(() => {
    const handleFirstInteraction = () => {
      startBGM()
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('touchstart', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }
  }, [startBGM])

  const handleEnterDream = () => {
    setShowChat(true)
  }

  // 確保視頻持續播放
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [isDay]) // 當晝夜切換時重新播放

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* 全局視頻背景 */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        webkitPlaysinline={true}
        className="fixed inset-0 h-full w-full object-cover"
        style={{ zIndex: 0, pointerEvents: 'none' }}
        onLoadedData={() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {})
          }
        }}
        onError={(e) => {
          console.error('视频加载错误:', e)
        }}
      >
        <source src={isDay ? '/assets/day_bg.mp4' : '/assets/night_bg.mp4'} type="video/mp4" />
      </video>

      {/* 全局點擊特效（銀色微塵） */}
      <GlobalClickEffect />

      {/* 首頁或聊天頁 */}
      <div className="relative z-10 min-h-dvh">
        <AnimatePresence mode="wait">
          {!showChat ? (
            <LandingPage key="landing" onEnterDream={handleEnterDream} />
          ) : (
            <ChatPage
              key="chat"
              ref={chatPageRef}
              onAutoGreeting={true}
              isMuted={isMuted}
              toggleMute={toggleMute}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
