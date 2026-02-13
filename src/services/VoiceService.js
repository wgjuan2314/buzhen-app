/**
 * VoiceService.js - 纯前端直连重构版 (绕过 Zeabur 后端限制)
 * P0 优先级：确保语音必须播放，安全策略暂退居二线
 */

// 1. 物理锁定：保持单例实例，解决 iOS 自动播放限制
if (typeof window !== 'undefined') {
  if (!window.yubaiAudio) {
    window.yubaiAudio = new Audio();
    window.yubaiAudio.name = "VoiceInstance";
    window.yubaiAudio.volume = 1.0; 
  }
  if (!window.yubaiBgm) {
    window.yubaiBgm = new Audio();
    window.yubaiBgm.name = "BgmInstance";
    window.yubaiBgm.loop = true;
    window.yubaiBgm.volume = 0.2; 
  }
}

const voiceInstance = typeof window !== 'undefined' ? window.yubaiAudio : null;
const bgmInstance = typeof window !== 'undefined' ? window.yubaiBgm : null;

// 从前端直接读取 VITE_ 变量
const getEnv = (name) => {
  try {
    const val = import.meta.env[name];
    if (!val) console.warn(`⚠️ [EnvCheck] 环境变量 ${name} 缺失`);
    return val || '';
  } catch (e) {
    return '';
  }
};

/**
 * 物理授权：入梦按钮点击时调用
 */
export const unlockAudioContext = () => {
  if (!voiceInstance || !bgmInstance) return;
  console.log("🔊 [Somnium] 执行全通道静音预热...");
  
  const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A";
  
  voiceInstance.src = silentSrc;
  bgmInstance.src = silentSrc;
  
  const p1 = voiceInstance.play().then(() => voiceInstance.pause());
  const p2 = bgmInstance.play().then(() => bgmInstance.pause());
  
  Promise.all([p1, p2]).then(() => {
    console.log("✅ [Somnium] iOS 双通道已解锁");
  }).catch(e => console.warn("音频解锁受限:", e.message));
};

/**
 * BGM 控制逻辑
 */
export const setBgmState = (enabled) => {
  if (!bgmInstance) return;
  
  if (!bgmInstance.src || bgmInstance.src === '' || bgmInstance.src.includes('data:audio')) {
    bgmInstance.src = '/assets/bgm.mp3'; // 确保路径正确
  }
  
  if (enabled) {
    if (bgmInstance.paused) {
      bgmInstance.play().catch(e => console.warn('[BGM] 播放失败:', e.message));
    }
  } else {
    bgmInstance.pause();
  }
};

/**
 * 语音合成播放逻辑 - 纯前端直连 MiniMax
 */
export async function generateSpeech(text) {
  // 核心：直接获取所有必要的 API 参数
  const API_KEY = getEnv('VITE_MINIMAX_API_KEY');
  const GROUP_ID = getEnv('VITE_MINIMAX_GROUP_ID');
  const VOICE_ID = getEnv('VITE_MINIMAX_VOICE_ID') || 'ttv-voice-2026010417565226-BIc2kWY0';

  if (!text || !API_KEY || !GROUP_ID) {
    console.error('❌ [VoiceService] 文本为空或 API 配置缺失');
    return;
  }

  // 1. 文本清洗
  const cleanedText = text.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();
  if (!cleanedText) return;

  // 2. 直连官方 API URL，绕过 /api/tts
  const officialUrl = `https://api.minimax.chat/v1/text_to_speech?GroupId=${GROUP_ID}`;

  console.log('🎙️ [VoiceService] 纯前端直连生成语音:', { textLength: cleanedText.length });

  try {
    const response = await fetch(officialUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'speech-01',
        text: cleanedText,
        voice_id: VOICE_ID,
        speed: 1.0, vol: 1.0, pitch: 0, stream: false
      })
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`MiniMax API 错误: ${errorMsg}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);

    // 3. 全局单例播放
    if (voiceInstance) {
      voiceInstance.pause();
      voiceInstance.src = audioUrl;
      return voiceInstance.play().catch(e => console.error('播放被拦截:', e));
    }
  } catch (error) {
    console.error('[Somnium] 语音合成或播放失败:', error);
  }
}