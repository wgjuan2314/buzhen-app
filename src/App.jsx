import { useState, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import SomniumLanding from './components/SomniumLanding'
import ChatPage from './components/ChatPage'
import GlobalClickEffect from './components/GlobalClickEffect'
import { useBGM } from './hooks/useBGM'

export default function App() {
  const [showChat, setShowChat] = useState(false)
  const chatPageRef = useRef(null)
  const { isMuted, toggleMute, startBGM } = useBGM()

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
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
