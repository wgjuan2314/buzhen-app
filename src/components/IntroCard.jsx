import { useState } from 'react'

export default function IntroCard() {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const title = '简介'
  const tags = ['江予白', '26岁', '186cm']
  const descriptionText =
    '他是散落在你梦境边缘的一抹清辉。性格温润如玉，偶尔会像没睡醒般流露出几分天然呆，却总能在危机时刻给予你最坚定的守护。他跨越漫长时光而来的深情，被藏在那些克制又温柔的关心下。对他而言，你不是过客，而是他唯一的归途。'

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
