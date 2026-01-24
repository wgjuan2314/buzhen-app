import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function GlobalClickEffect() {
  const [ripples, setRipples] = useState([]) // 水波紋列表
  const canvasRef = useRef(null) // Canvas 引用
  const particlesRef = useRef([]) // 粒子列表
  const animationFrameRef = useRef(null) // 動畫幀引用

  // 檢查是否為交互元素（避開熱點區域）
  const isInteractiveElement = useCallback((element) => {
    if (!element) return false

    // 檢查標籤名
    const tagName = element.tagName?.toLowerCase()
    if (['button', 'input', 'textarea', 'select', 'a'].includes(tagName)) {
      return true
    }

    // 檢查樣式
    const computedStyle = window.getComputedStyle(element)
    const cursor = computedStyle.cursor
    if (cursor === 'pointer' || cursor === 'grab' || cursor === 'grabbing') {
      return true
    }

    // 檢查是否有交互相關的類名或屬性
    if (
      element.getAttribute('role') === 'button' ||
      element.getAttribute('tabindex') !== null ||
      element.onclick !== null ||
      element.classList?.contains('cursor-pointer')
    ) {
      return true
    }

    return false
  }, [])

  // 創建銀色星塵粒子系統（優雅月光風格）
  const createParticles = useCallback((x, y) => {
    const particleCount = 15 + Math.floor(Math.random() * 6) // 15-20 個粒子，稀疏優雅
    const colors = [
      { r: 255, g: 255, b: 255, hex: '#FFFFFF' }, // 純白色
      { r: 224, g: 224, b: 224, hex: '#E0E0E0' }, // 淺銀
      { r: 245, g: 245, b: 245, hex: '#F5F5F5' }, // 亮白
    ]

    for (let i = 0; i < particleCount; i++) {
      // 隨機角度爆炸噴射
      const angle = Math.random() * Math.PI * 2

      // 爆發半徑：在中心點半徑 5-10px 的圓周上生成
      const radius = 5 + Math.random() * 5
      const offsetX = Math.cos(angle) * radius
      const offsetY = Math.sin(angle) * radius

      // 極低調動態：降低初始速度，緊貼水波紋邊緣輕輕散開即止
      const speed = 0.3 + Math.random() * 0.7 // 初始速度（極低調，不要飛太遠）
      const color = colors[Math.floor(Math.random() * colors.length)]

      particlesRef.current.push({
        x: x + offsetX, // 從圓周上的點開始
        y: y + offsetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 0.5 + Math.random() * 1.0, // 極細碎化：0.5-1.5px，像屏幕上的像素粒
        color: color.hex,
        colorRgb: { r: color.r, g: color.g, b: color.b },
        life: 1.0,
        decay: 1.0 / (0.5 * 60), // 0.5 秒內完全消失（加速消散，眨眼間融入背景）
        fadeStart: 0.3, // 從 30% 生命值開始變透明（更早開始消散）
        gravity: 0.03 + Math.random() * 0.02, // 極輕柔的重力下墜
        friction: 0.92 + Math.random() * 0.03, // 空氣阻力（快速減速）
      })
    }
  }, [])

  // 處理點擊事件：創建水波紋和粒子效果
  const handleClick = useCallback(
    (e) => {
      // 避開熱點區域：如果點擊的是交互元素，不產生特效
      if (isInteractiveElement(e.target)) {
        return
      }

      // 獲取點擊坐標
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0
      const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0

      // 計算 Canvas 邏輯坐標（考慮 Canvas 縮放）
      const canvas = canvasRef.current
      let x = clientX
      let y = clientY
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        // 轉換為 Canvas 邏輯坐標（因為使用了 ctx.scale，所以不需要乘以 dpr）
        x = clientX - rect.left
        y = clientY - rect.top
      }

      // 創建水波紋（保留原有效果，增加層次感）
      const rippleId = Date.now()
      setRipples((prev) => [...prev, { id: rippleId, x: clientX, y: clientY }])

      // 500ms 後移除水波紋（與粒子消散時間一致）
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== rippleId))
      }, 500)

      // 創建銀色星塵粒子效果（優雅月光風格）
      createParticles(x, y)
    },
    [createParticles, isInteractiveElement],
  )

  // Canvas 動畫循環
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    // 設置 Canvas 尺寸（自動鋪滿全屏）
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 動畫循環
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 設置混合模式：讓重疊的粒子產生高亮閃爍效果
      ctx.globalCompositeOperation = 'lighter'

      // 更新並繪製銀色星塵粒子（優雅月光風格）
      particlesRef.current = particlesRef.current.filter((particle) => {
        // 更新位置（輕柔物理感：輕柔的重力下墜和空氣阻力）
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += particle.gravity // 輕柔的重力下墜
        particle.vx *= particle.friction // 空氣阻力（逐漸減速）
        particle.vy *= particle.friction

        // 更新生命值
        particle.life -= particle.decay

        // 繪製粒子（優雅月光風格：清冷發光、唯美消散）
        if (particle.life > 0) {
          ctx.save()

          // 加速消散：更早開始變透明，眨眼間融入背景
          const fadeStart = particle.fadeStart || 0.3
          let alpha = particle.life
          if (particle.life < fadeStart) {
            // 從 fadeStart 開始加速變透明
            alpha = particle.life / fadeStart
          }

          ctx.globalAlpha = alpha

          // 粒子大小隨生命值逐漸變小（極細碎化）
          const currentSize = particle.size * particle.life

          // 低調發光效果：使用亮白色 shadowColor，極微弱的發光（像呼吸間閃爍的微塵）
          ctx.shadowBlur = 2 + particle.life * 2 // 極低調的發光
          ctx.shadowColor = '#FFFFFF' // 亮白色，清冷發光

          // 繪製粒子（極細碎的像素粒）
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2)
          ctx.fill()

          // 內層高光（極低調，只在生命值較高時顯示）
          if (particle.life > 0.5) {
            ctx.globalAlpha = alpha * 0.6
            ctx.shadowBlur = 1
            ctx.fillStyle = `rgba(${particle.colorRgb.r}, ${particle.colorRgb.g}, ${particle.colorRgb.b}, 1)`
            ctx.beginPath()
            ctx.arc(particle.x, particle.y, currentSize * 0.4, 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.restore()
          return true
        }
        return false
      })

      // 恢復默認混合模式
      ctx.globalCompositeOperation = 'source-over'

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // 全局點擊監聽
  useEffect(() => {
    document.addEventListener('click', handleClick)
    document.addEventListener('touchstart', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [handleClick])

  return (
    <>
      {/* Canvas 銀色星塵粒子層（優雅月光風格） */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9999 }}
      />

      {/* 水波紋效果（淡淡的白色半透明，緩慢擴散） */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            className="fixed rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: '20px',
              height: '20px',
              transform: 'translate(-50%, -50%)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              background: 'transparent',
              boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.2)',
              zIndex: 9998,
            }}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{
              scale: 6,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>
    </>
  )
}
