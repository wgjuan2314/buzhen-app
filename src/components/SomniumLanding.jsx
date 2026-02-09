import React from 'react';
import './SomniumLanding.css';

const SomniumLanding = ({ onEnter }) => {
  return (
    <div className="landing-container">
      {/* 1. 视频底座 */}
      <video 
        autoPlay muted loop playsInline 
        className="background-video" 
        src="/assets/bg-video.mp4" 
      />
      
      {/* 2. 粉色梦幻遮罩层 */}
      <div className="pink-overlay"></div>

      {/* 3. 内容层 */}
      <div className="landing-page-content">
        <div className="brand-header">
          <h1 className="brand-name">Somnium</h1>
          <p className="brand-subtitle">梦境守护者 · 江予白</p>
        </div>

        {/* 4. 按钮打包区域 */}
        <div className="dream-section">
          <button className="dream-btn" onClick={onEnter}>
            {/* 增强波纹层 [cite: 35-36] */}
            <div className="ripple-ring-2"></div>
            <div className="dream-btn-inner">
              <span className="dream-text">入梦</span>
              <span className="dream-sub">ENTER DREAM</span>
            </div>
          </button>
        </div>

        <div className="footer-note">内容由AI生成，使用请遵守平台社区公约</div>
      </div>
    </div>
  );
};

export default SomniumLanding;