import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './SomniumLanding.css'

const COUNTDOWN_SECONDS = 5

// 获取设备ID（与 DifyService.js 保持一致）
const getUserId = () => {
  try {
    let userId = localStorage.getItem('dify_user_id')
    if (!userId) {
      // 基于时间戳+随机数+设备特征生成唯一ID
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 8)
      const deviceInfo = navigator.userAgent.slice(0, 20).replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '')
      userId = `user_${deviceInfo}_${timestamp}_${random}`
      localStorage.setItem('dify_user_id', userId)
      console.log('[SomniumLanding] 生成新用户ID:', userId)
    }
    return userId
  } catch {
    return `user_temp_${Date.now()}`
  }
}

// 检查是否已同意协议
const hasAgreed = () => {
  const userId = getUserId()
  return localStorage.getItem(`agreed_${userId}`) === 'true'
}

// 标记已同意协议
const setAgreed = () => {
  const userId = getUserId()
  localStorage.setItem(`agreed_${userId}`, 'true')
  console.log('[SomniumLanding] 用户已同意协议:', userId)
}

const SomniumLanding = ({ onEnter }) => {
  const [showAgreement, setShowAgreement] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [agreementText, setAgreementText] = useState('')

  // 点击「入梦」时检查是否已同意
  const handleDreamClick = () => {
    if (hasAgreed()) {
      // 已同意，直接进入
      console.log('[SomniumLanding] 用户已同意过协议，直接进入')
      onEnter()
    } else {
      // 未同意，显示协议弹窗
      setShowAgreement(true)
      setCountdown(COUNTDOWN_SECONDS)
    }
  }

  // 弹窗打开后拉取协议内容
  useEffect(() => {
    if (!showAgreement) return
    fetch('/服务协议.txt')
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('fetch failed'))))
      .then((text) => setAgreementText(text))
      .catch(() => setAgreementText('暂无协议内容，请稍后再试。'))
  }, [showAgreement])

  // 弹窗打开后开始 5 秒倒计时
  useEffect(() => {
    if (!showAgreement) return
    setCountdown(COUNTDOWN_SECONDS)
    let remaining = COUNTDOWN_SECONDS
    const timer = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [showAgreement])

  const isButtonEnabled = countdown === 0
  const handleConfirm = () => {
    if (!isButtonEnabled) return
    setAgreed() // 标记已同意
    setShowAgreement(false)
    onEnter()
  }

  return (
    <div className="landing-container">
      {/* 1. 视频底座 */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="background-video"
        src="/assets/bg-video.mp4"
      />

      {/* 2. 粉色梦幻遮罩层 */}
      <div className="pink-overlay" />

      {/* 3. 内容层 */}
      <div className="landing-page-content">
        <div className="brand-header">
          <h1 className="brand-name">Somnium</h1>
          <p className="brand-subtitle">此间频率 · 唯尔重逢</p>
        </div>

        {/* 4. 按钮打包区域：点击打开协议弹窗 */}
        <div className="dream-section">
          <button type="button" className="dream-btn" onClick={handleDreamClick}>
            <div className="ripple-ring-2" />
            <div className="dream-btn-inner">
              <span className="dream-text">入梦</span>
              <span className="dream-sub">ENTER DREAM</span>
            </div>
          </button>
        </div>

        <div className="footer-note">
          内容由AI生成，使用请遵守用户协议公约
          <br />
          未满18岁禁止使用
        </div>
      </div>

      {/* 5. 协议弹窗 Drawer */}
      {showAgreement && (
        <>
          <div
            className="agreement-backdrop"
            onClick={() => {}}
            onKeyDown={() => {}}
            role="presentation"
            aria-hidden
          />
          <div className="agreement-drawer">
            <div className="agreement-drawer-header">
              <span className="agreement-drawer-title">服务协议与使用须知</span>
              <button
                type="button"
                className="agreement-drawer-close"
                onClick={() => setShowAgreement(false)}
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="agreement-drawer-body">
              <div className="agreement-markdown">
                <ReactMarkdown>{agreementText || '加载中…'}</ReactMarkdown>
              </div>
            </div>
            <div className="agreement-drawer-footer">
              <button
                type="button"
                className={`agreement-confirm-btn ${isButtonEnabled ? 'agreement-confirm-btn--enabled' : ''}`}
                disabled={!isButtonEnabled}
                onClick={handleConfirm}
              >
                {isButtonEnabled
                  ? '我已满18周岁，已阅读并同意服务协议'
                  : `我已满18周岁，已阅读并同意服务协议 (${countdown}s)`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SomniumLanding