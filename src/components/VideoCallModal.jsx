import { motion } from 'framer-motion'
import videoCallBg from '../assets/v2/jiangyubai_call.mp4'
import iconYuyin from '../assets/v2/icon-yuyin.png'
import iconShipin from '../assets/v2/icon-shipin.png'
import iconTouping from '../assets/v2/icon-touping.png'
import iconOff from '../assets/v2/icon-off.png'
import './VideoCallModal.css'

export default function VideoCallModal({ onClose }) {
  return (
    <motion.div
      className="video-call-modal"
      initial={{ scale: 1.1, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
    >
      {/* 背景視頻 */}
      <video
        className="video-call-bg"
        src={videoCallBg}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      />

      {/* UI 遮罩層 */}
      <div className="video-call-overlay">
        {/* 頂部氛圍：講故事膠囊（僅展示） */}
        <div className="video-call-top-capsule">
          <span className="video-call-capsule-icon" aria-hidden>🌙</span>
          <span className="video-call-capsule-text">让他给你讲故事</span>
        </div>

        {/* 底部區域：提示文字 + 工具欄 + 腳注 */}
        <div className="video-call-bottom-block">
          {/* 提示文字 + Framer Motion 省略號動畫 */}
          <p className="video-call-hint">
            可以和江予白聊天哦
            <span className="video-call-ellipsis" aria-hidden>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="video-call-dot"
                  animate={{
                    opacity: [0.4, 1, 0.4],
                    y: [0, -3, 0],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                >
                  .
                </motion.span>
              ))}
            </span>
          </p>

          {/* 底部工具欄：語音 / 視頻 / 投屏（僅展示+輕微縮放）/ 關閉（可點擊） */}
          <div className="video-call-toolbar">
            <motion.button
              type="button"
              className="video-call-tool-btn"
              aria-label="語音"
              tabIndex={-1}
              whileTap={{ scale: 0.9 }}
            >
              <img src={iconYuyin} alt="" />
            </motion.button>
            <motion.button
              type="button"
              className="video-call-tool-btn"
              aria-label="視頻"
              tabIndex={-1}
              whileTap={{ scale: 0.9 }}
            >
              <img src={iconShipin} alt="" />
            </motion.button>
            <motion.button
              type="button"
              className="video-call-tool-btn"
              aria-label="投屏"
              tabIndex={-1}
              whileTap={{ scale: 0.9 }}
            >
              <img src={iconTouping} alt="" />
            </motion.button>
            <motion.button
              type="button"
              className="video-call-hangup"
              aria-label="關閉"
              onClick={onClose}
              whileTap={{ scale: 0.9 }}
            >
              <img src={iconOff} alt="" />
            </motion.button>
          </div>

          <p className="video-call-disclaimer">内容由 AI 生成</p>
        </div>
      </div>
    </motion.div>
  )
}
