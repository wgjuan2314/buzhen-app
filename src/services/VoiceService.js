/**
 * VoiceService.js - 物理级单例锁定重构版 (隔离 BGM 与语音)
 */

// 1. 物理锁定：创建两个独立的全局实例，防止互相干扰
if (typeof window !== 'undefined') {
  if (!window.yubaiAudio) {
    window.yubaiAudio = new Audio();
    window.yubaiAudio.name = "VoiceInstance";
    window.yubaiAudio.volume = 1.0; // 【iOS 音量平衡】语音清晰大声
  }
  if (!window.yubaiBgm) {
    window.yubaiBgm = new Audio();
    window.yubaiBgm.name = "BgmInstance";
    window.yubaiBgm.loop = true;
    window.yubaiBgm.volume = 0.2; // 【iOS 音量平衡】BGM 温和不吵闹（微调）
  }
}

const voiceInstance = typeof window !== 'undefined' ? window.yubaiAudio : null;
const bgmInstance = typeof window !== 'undefined' ? window.yubaiBgm : null;

// 安全获取环境变量（Zeabur 云端会自动注入这些 VITE_ 开头的变量）
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
 * 【关键】物理授权：入梦按钮点击时调用。
 * 同时激活语音通道和 BGM 通道，解决 iOS 自动播放限制
 */
export const unlockAudioContext = () => {
  if (!voiceInstance || !bgmInstance) return;
  console.log("🔊 [Somnium] 执行全通道静音预热...");
  
  const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A";
  
  // 必须在点击同步回调中执行 play
  voiceInstance.src = silentSrc;
  bgmInstance.src = silentSrc;
  
  const p1 = voiceInstance.play().then(() => voiceInstance.pause());
  const p2 = bgmInstance.play().then(() => bgmInstance.pause());
  
  Promise.all([p1, p2]).then(() => {
    console.log("✅ [Somnium] iOS 语音/BGM 双通道已解锁");
  }).catch(e => console.warn("音频解锁受限:", e.message));
};

/**
 * 【BGM 控制】管理背景音乐的播放与暂停
 * @param {boolean} enabled - true 为播放，false 为暂停
 */
export const setBgmState = (enabled) => {
  if (!bgmInstance) return;
  
  // 如果 BGM 还没有设置 src，先设置
  if (!bgmInstance.src || bgmInstance.src === '') {
    bgmInstance.src = '/assets/bgm.mp3';
  }
  
  if (enabled) {
    // 播放 BGM
    if (bgmInstance.paused) {
      bgmInstance.play().catch((error) => {
        console.warn('[Somnium] BGM 播放失败:', error.message);
      });
      console.log("🔊 [Somnium] BGM 已开启");
    }
  } else {
    // 暂停 BGM
    if (!bgmInstance.paused) {
      bgmInstance.pause();
      console.log("🔇 [Somnium] BGM 已关闭");
    }
  }
};

/**
 * 语音合成播放逻辑 (使用独立的 VoiceInstance 通道)
 * 通过后端 API 代理请求 MiniMax，解决 CORS 问题
 */
export async function generateSpeech(text) {
  // 获取环境变量（用于 voice_id，如果后端需要）
  const VOICE_ID = getEnv('VITE_MINIMAX_VOICE_ID') || 'ttv-voice-2026010417565226-BIc2kWY0';

  if (!text) return;

  // 1. 文本清洗
  const cleanedText = text
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .trim();

  if (!cleanedText) return;

  // 2. 请求我们自己的后端 API（解决 CORS 问题）
  const apiUrl = '/api/tts';

  console.log('🔍 [VoiceService] 请求后端 TTS API:', {
    url: apiUrl,
    voiceId: VOICE_ID,
    textLength: cleanedText.length
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: cleanedText,
        voice_id: VOICE_ID,
        speed: 1.0,
        vol: 1.0,
        pitch: 0
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`TTS API Error ${response.status}: ${errorData.error || response.statusText}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);

    // 3. 核心：使用全局单例播放，不创建新对象，防止 iOS 拦截
    if (voiceInstance) {
      // 【播放稳定性】先暂停、清除旧的 src 并重置，确保切换音频源时不会出错
      voiceInstance.pause();
      voiceInstance.src = ''; // 清除旧的 src
      voiceInstance.load(); // 重置音频元素
      // 切换音频源
      voiceInstance.src = audioUrl;
      console.log("🔊 [Somnium] 江予白说话中...");
      // 返回 play() 的 Promise，以便在调用处能捕获播放状态
      return voiceInstance.play();
    }
  } catch (error) {
    console.error('[Somnium] 播放失败:', error);
  }
}