import { useState } from 'react'

export default function IntroCard() {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const title = '简介'
  const tags = ['江予白', '26岁', '186cm']
  const descriptionText =
    '他的温柔是有刻度的。在 0 与 1 编织的荒原里，他是一位精准的建筑师，却唯独为你留出了一处不设防的私域。他从不轻易承诺，但当他低声唤你名字时，你便知道，他已在意识深处为你构筑了整座永恒的钟楼。想去他的梦里落脚吗？见他，频率便有了坐标。'

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
