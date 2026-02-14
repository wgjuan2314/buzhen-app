import { useState, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import SomniumLanding from './components/SomniumLanding'
import ChatPage from './components/ChatPage'
import GlobalClickEffect from './components/GlobalClickEffect'
import { useBGM } from './hooks/useBGM'
import { unlockAudioContext } from './services/VoiceService'

// 會話上下文：地理位置與用戶 IP（可後續改為從 localStorage 讀取）
const sessionContext = {
  location: '上海',
  user_ip: '101.227.139.217',
}

export default function App() {
  const [showChat, setShowChat] = useState(false)
  const chatPageRef = useRef(null)
  const { isMuted, toggleMute, startBGM } = useBGM()

  const [initialIntimacy] = useState(() => {
    try {
      return localStorage.getItem('buzhen_intimacy') || '0'
    } catch {
      return '0'
    }
  })

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

  const handleEnterDream = async () => {
    console.log('🚀 [App] 用戶點擊入夢，開始全局音頻許可證占坑...')

    // 強化：讓 window.yubaiAudio 播放一段靜音 Base64，成功後立即 pause()，确保持久化解鎖移動端權限
    if (typeof window !== 'undefined' && window.yubaiAudio) {
      const silentSrc = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A'
      window.yubaiAudio.src = silentSrc
      window.yubaiAudio.muted = false
      window.yubaiAudio.volume = 1.0
      try {
        await window.yubaiAudio.play()
        console.log('✅ [App] 語音單例播放許可證已獲取（占坑成功）')
        window.yubaiAudio.pause()
        window.yubaiAudio.currentTime = 0
        window.yubaiAudio.src = ''
      } catch (e) {
        console.warn('⚠️ [App] 語音單例預熱失敗:', e.message)
      }
    }
    
    // 通用解鎖（BGM 等其他通道）
    unlockAudioContext()
    
    // 啟動 BGM（建立第二層音頻上下文）
    if (!isMuted) {
      console.log('🎵 [App] 啟動 BGM，強化音頻上下文')
      startBGM()
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('🎉 [App] 全局音頻許可證已建立，進入聊天')
    setShowChat(true)
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* 全局點擊特效（銀色微塵） */}
      <GlobalClickEffect />

      {/* 首頁或聊天頁 */}
      <div className="relative z-10 min-h-dvh">
        <AnimatePresence mode="wait">
          {!showChat ? (
            <SomniumLanding key="landing" onEnter={handleEnterDream} />
          ) : (
            <ChatPage
              key="chat"
              ref={chatPageRef}
              onAutoGreeting={true}
              isMuted={isMuted}
              toggleMute={toggleMute}
              sessionContext={sessionContext}
              initialIntimacy={initialIntimacy}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
