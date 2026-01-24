import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function IntroCard() {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const titlePart1 = '简介'
  const titlePart2 = ' 江予白、26岁、186、🌙 梦境守护者'
  const descriptionText =
    '他是散落在你梦境边缘的一抹清辉。性格温润如玉，偶尔会像没睡醒般流露出几分天然呆，却总能在危机时刻给予你最坚定的守护。他跨越漫长时光而来的深情，被藏在那些克制又温柔的关心下。对他而言，你不是过客，而是他唯一的归途。'

  // 贝塞尔曲线：优雅的展开动画
  const bezierEase = [0.04, 0.62, 0.23, 0.98]

  return (
    <motion.div
      className="mb-[30px] mt-6 cursor-pointer overflow-hidden rounded-2xl bg-black/20 p-3 backdrop-blur-md transition-all active:scale-[0.98]"
      onClick={toggleExpand}
      layout
      style={{
        WebkitTapHighlightColor: 'transparent',
      }}
      transition={{
        duration: 0.8,
        ease: bezierEase,
      }}
    >
      <div className="relative">
        {/* 标题行 */}
        <p className="mb-2 text-xs leading-relaxed text-white">
          <span className="font-bold">{titlePart1}</span>
          <span className="font-normal text-white/80">{titlePart2}</span>
        </p>

        {/* 描述详情 */}
        <motion.div
          layout
          transition={{
            duration: 0.8,
            ease: bezierEase,
          }}
        >
          <AnimatePresence initial={false}>
            {isExpanded ? (
              <motion.p
                key="expanded"
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(2px)' }}
                transition={{
                  duration: 0.8,
                  ease: bezierEase,
                }}
                className="text-xs leading-relaxed text-white"
              >
                {descriptionText}
              </motion.p>
            ) : (
              <motion.p
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.8,
                  ease: bezierEase,
                }}
                className="line-clamp-2 text-xs leading-relaxed text-white"
              >
                {descriptionText}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 展开/收起图标（直角边框） */}
        <motion.div
          className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{
            duration: 0.8,
            ease: bezierEase,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="opacity-60"
          >
            <path
              d="M2 10V10C2 10 2 2 2 2M2 2H10"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  )
}
