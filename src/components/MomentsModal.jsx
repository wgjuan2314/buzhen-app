import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, ArrowLeft } from 'lucide-react'

// 静态资源：确保引用路径与 /src/assets/v2 下实际文件一致
import avatarJiang from '../assets/v2/avatar-ai-small.png'
import toutuImg from '../assets/v2/toutu.png'
import coffeeImg from '../assets/v2/coffee.jpg'
import sakuraImg from '../assets/v2/sakura.jpg'
import selfieImg from '../assets/v2/selfie.jpg'

/**
 * 朋友圈静态数据（数据驱动）
 * 每条：头像、用户名、文案、图片数组、点赞数、发布时间、评论区
 */
const MOMENTS_DATA = [
  {
    id: '1',
    avatar: avatarJiang,
    username: '江予白',
    content: '一个人的咖啡时光, 但想起了你说的那句话。今天终于有空看这本书了。',
    images: [coffeeImg],
    likeCount: 0,
    publishTime: '2小时前',
    comments: [
      { commenterName: 'lili', text: '我也正在咖啡时间...' },
      { commenterName: '江予白', text: '小朋友, 这个时间点喝小心晚上会睡不着啦😋', replyTo: 'lili' },
    ],
  },
  {
    id: '2',
    avatar: avatarJiang,
    username: '江予白',
    content: '樱花落下的速度是每秒五厘米, 我该用怎样的速度, 才能与你相遇?',
    images: [sakuraImg],
    likeCount: 0,
    publishTime: '2小时前',
    comments: [
      { commenterName: 'lili', text: '今年的樱花好像比昨天更粉了' },
      { commenterName: '江予白', text: '下个周末可以一起看🌸🌸吗, 顺便还可以去看展', replyTo: 'lili' },
    ],
  },
  {
    id: '3',
    avatar: avatarJiang,
    username: '江予白',
    content: '今天的光特别好, 你的眼光也是。',
    images: [selfieImg],
    likeCount: 0,
    publishTime: '27分钟前',
    comments: [
      { commenterName: '江予白', text: '夕阳好美' },
    ],
  },
]

export default function MomentsModal({ onClose }) {
  const [likedMap, setLikedMap] = useState({})
  const [displayLikeCount, setDisplayLikeCount] = useState(
    MOMENTS_DATA.reduce((acc, m) => ({ ...acc, [m.id]: m.likeCount }), {})
  )
  const [previewImage, setPreviewImage] = useState(null)

  const handleLike = (momentId) => {
    const isLiked = likedMap[momentId]
    setLikedMap((prev) => ({ ...prev, [momentId]: !isLiked }))
    setDisplayLikeCount((prev) => ({
      ...prev,
      [momentId]: prev[momentId] + (isLiked ? -1 : 1),
    }))
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-[999] flex h-full w-full flex-col bg-[#FFFAF7]"
    >
      <style>{`.moments-scroll::-webkit-scrollbar { display: none; } .moments-scroll { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* 顶部栏：仅箭头图标，深色箭头 + 轻微圆形半透明遮罩 */}
      <header className="absolute left-0 right-0 top-0 z-10 flex h-12 shrink-0 items-center px-2 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/40 text-gray-800 active:opacity-80"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-base font-medium text-white drop-shadow-md">
          朋友圈
        </span>
      </header>

      {/* 内容流：可滑动浏览，隐藏滚动条 */}
      <main
        className="moments-scroll flex-1 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* 头部封面：toutu.png，宽度 100%，高度约 280px，cover 居中 */}
        <div
          className="w-full shrink-0"
          style={{
            height: 280,
            backgroundImage: `url(${toutuImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-hidden
        />

        {/* 动态列表：背景与页面统一 #FFFAF7，用细边框区分区块 */}
        <ul className="border-t border-[#f0ebe6] bg-[#FFFAF7] px-3 pb-4 pt-4 shadow-[0_-1px_0_0_rgba(0,0,0,0.04)]">
          {MOMENTS_DATA.map((moment) => (
            <li key={moment.id} className="flex gap-3 border-b border-[#f0ebe6] py-4 last:border-b-0">
                {/* 左侧头像 */}
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                  <img
                    src={moment.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* 右侧：姓名（蓝）、内容、图片网格、评论区 */}
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium text-[#576b95]">
                    {moment.username}
                  </div>
                  <div className="mt-1 text-[15px] leading-relaxed text-black">
                    {moment.content}
                  </div>
                  {/* 图片网格 */}
                  {moment.images && moment.images.length > 0 && (
                    <div
                      className={`mt-2 grid gap-1 ${
                        moment.images.length === 1
                          ? 'grid-cols-1'
                          : moment.images.length === 2
                            ? 'grid-cols-2'
                            : moment.images.length === 4
                              ? 'grid-cols-2'
                              : 'grid-cols-3'
                      }`}
                      style={{
                        maxWidth:
                          moment.images.length === 1
                            ? 240
                            : moment.images.length <= 4
                              ? 160
                              : 220,
                      }}
                    >
                      {moment.images.map((src, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="aspect-square w-full overflow-hidden rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#576b95]"
                          onClick={() => setPreviewImage(src)}
                        >
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {/* 时间 + 点赞 */}
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-[#b2b2b2]">
                    <span>{moment.publishTime}</span>
                    <button
                      type="button"
                      onClick={() => handleLike(moment.id)}
                      className="flex items-center gap-1 rounded px-1 py-0.5 active:opacity-80"
                      aria-label="点赞"
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          likedMap[moment.id]
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-400'
                        }`}
                      />
                      <span className="text-[#b2b2b2]">
                        {displayLikeCount[moment.id] ?? moment.likeCount}
                      </span>
                    </button>
                  </div>
                  {/* 评论区 */}
                  {moment.comments && moment.comments.length > 0 && (
                    <div className="mt-2 rounded bg-[#faf6f3] px-2 py-2">
                      {moment.comments.map((c, i) => (
                        <div key={i} className="text-[13px] leading-relaxed text-black">
                          <span className="font-medium text-[#576b95]">
                            {c.commenterName}
                            {c.replyTo ? ' 回复 ' : ': '}
                          </span>
                          {c.replyTo && (
                            <span className="font-medium text-[#576b95]">{c.replyTo}</span>
                          )}
                          {c.replyTo && <span className="text-[#576b95]">: </span>}
                          <span>{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </li>
          ))}
        </ul>
      </main>

      {/* 大图预览：全屏黑色遮罩，居中原图，点击遮罩任意位置关闭 */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95"
            onClick={() => setPreviewImage(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Escape' && setPreviewImage(null)}
            aria-label="关闭预览"
          >
            <img
              src={previewImage}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
