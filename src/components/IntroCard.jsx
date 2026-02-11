import { useState } from 'react'

export default function IntroCard() {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const title = '简介'
  const tags = ['江予白', '26岁', '186cm']
  const descriptionText =
    '他的温柔会上瘾。有些话只在深夜说，有些眼神只在某个瞬间读懂，有些心动说不清道不明，但当他叫你名字的时候，你就懂了。他让你相信，这世上真的有人会把你放在第一位，会在你需要的每个时刻出现，会用他的方式，把你宠成小孩。想被这样偏爱吗？见他，你就知道了。'

  return (
    <div
      className={`intro-card-container ${isExpanded ? 'expanded' : ''}`}
      onClick={toggleExpand}
      style={{
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
      }}
    >
      {/* 头部标签区 */}
      <div className="intro-card-header">
        <h3 className="intro-card-title">{title}</h3>
        <div className="intro-card-tags">
          {tags.map((tag, index) => (
            <span key={index} className="intro-card-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 内容文本区 */}
      <div className={isExpanded ? 'intro-card-expanded-text' : 'intro-card-collapsed-text'}>
        🌙 {descriptionText}
      </div>
    </div>
  )
}
