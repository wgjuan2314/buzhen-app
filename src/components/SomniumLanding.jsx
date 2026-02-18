import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './SomniumLanding.css'

const COUNTDOWN_SECONDS = 5

const SomniumLanding = ({ onEnter }) => {
  const [showAgreement, setShowAgreement] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [agreementText, setAgreementText] = useState('')

  // 点击「入梦」时打开协议弹窗
  const handleDreamClick = () => {
    setShowAgreement(true)
    setCountdown(COUNTDOWN_SECONDS)
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
                  ? '我已满18岁，已阅读并同意服务协议'
                  : `我已满18岁，已阅读并同意服务协议 (${countdown}s)`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SomniumLanding
