import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { unlockAudio } from '../services/VoiceService'

export default function LandingPage({ onEnterDream, onUnlockAudio }) {
  const { t, i18n } = useTranslation()
  const enterSoundRef = useRef(null)
  const [isExiting, setIsExiting] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  const handleEnter = async () => {
    // 解鎖全局音頻權限（僅執行一次）
    if (!audioUnlocked) {
      setAudioUnlocked(true)
      
      // 1. 解鎖移動端音頻上下文（AudioContext）
      try {
        await unlockAudio()
        console.log('[LandingPage] 音頻上下文已解鎖')
      } catch (error) {
        console.warn('[LandingPage] 解鎖音頻上下文失敗:', error)
      }
      
      // 2. 立即調用 BGM 的 play() 方法進行"熱身"
      // 這會觸發音頻加載並激活音頻上下文，不等待 API 返回
      if (onUnlockAudio) {
        try {
          onUnlockAudio()
          console.log('[LandingPage] BGM 已啟動（熱身）')
        } catch (error) {
          console.warn('[LandingPage] BGM 啟動失敗:', error)
        }
      }
    }

    // 播放入夢音效
    if (enterSoundRef.current) {
      enterSoundRef.current.play().catch(() => {})
    }

    // 觸發退出動畫
    setIsExiting(true)

    // 等待音效播放一小段後再切換（約 0.3 秒）
    setTimeout(() => {
      onEnterDream()
    }, 300)
  }


  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="relative min-h-dvh"
        >
          {/* 全寬容器 - 鋪滿屏幕寬度，使用 Flexbox 強制居中 */}
          <div
            className="absolute z-10"
            style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              bottom: 'calc(33% - 10px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* 波紋擴散效果 - 3 個圓形層，絕對定位重合於中心 */}
            {[0, 1, 2].map((index) => (
              <motion.div
                key={`ripple-${index}`}
                className="absolute rounded-full"
                style={{
                  position: 'absolute',
                  width: '120px',
                  height: '120px',
                  top: '50%',
                  left: '50%',
                  marginTop: '-60px',
                  marginLeft: '-60px',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
                }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{
                  scale: [1, 2.8],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.9,
                  ease: 'easeOut',
                }}
              />
            ))}

            {/* 入夢按鈕 - 圓形與流光，絕對定位重合於中心 */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
              onClick={handleEnter}
              className="absolute rounded-full overflow-hidden transition-all hover:scale-110 active:scale-95"
              style={{
                position: 'absolute',
                width: '110px',
                height: '110px',
                top: '50%',
                left: '50%',
                marginTop: '-55px',
                marginLeft: '-55px',
                background: 'linear-gradient(to top right, rgba(255, 255, 255, 0.2), rgba(147, 197, 253, 0.3))',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 30px rgba(255, 255, 255, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                zIndex: 10,
              }}
            >
              {/* 流光效果 - 光線掃過 */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.5) 45%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
                  transform: 'rotate(-45deg)',
                  width: '200%',
                  height: '200%',
                }}
                animate={{
                  x: ['-150%', '150%'],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 1.5,
                  ease: 'easeInOut',
                }}
              />

              {/* 按鈕文字 */}
              <span className="relative z-10 flex h-full w-full items-center justify-center text-base font-light text-white">
                {i18n.language === 'zh-CN' ? '入梦' : 'Dream'}
              </span>
            </motion.button>
          </div>

          {/* 隱藏的音效元素 */}
          <audio ref={enterSoundRef} src="/assets/enter_dream.mp3" preload="auto" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
