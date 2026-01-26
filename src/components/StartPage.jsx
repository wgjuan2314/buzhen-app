import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { unlockAudioContext } from '../services/VoiceService'

export default function StartPage({ onEnterDream, onUnlockAudio }) {
  const { t, i18n } = useTranslation()
  const enterSoundRef = useRef(null)
  const [isExiting, setIsExiting] = useState(false)

  const handleStart = () => {
    // 【核心】第一行就執行：物理激活全局音頻單例，繞過 iOS Safari 自動播放限制
    unlockAudioContext()

    // 立即調用 BGM 的 play() 方法進行"熱身"
    if (onUnlockAudio) {
      try {
        onUnlockAudio()
        console.log('[StartPage] BGM 已啟動（熱身）')
      } catch (error) {
        console.warn('[StartPage] BGM 啟動失敗:', error)
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

            {/* 夢境原點 - MetaSight 細膩風格，完美圓形，呼吸動效 */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0.7, 0.9, 0.7], 
                scale: [1, 1.03, 1] 
              }}
              transition={{ 
                delay: 0.5,
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              whileHover={{ 
                scale: 1.1, 
                backgroundColor: "rgba(255,255,255,0.15)", 
                borderColor: "rgba(255,255,255,0.4)" 
              }}
              onClick={handleStart}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-[90px] w-[90px] items-center justify-center rounded-full bg-white/[0.05] backdrop-blur-[30px] border-[0.5px] border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] z-10"
            >
              {/* 按鈕文字 */}
              <span className="relative z-10 text-white font-light tracking-[0.5em] text-[14px] ml-[0.5em]">
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
