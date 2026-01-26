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
 */
export async function generateSpeech(text) {
  // 这里的 Key 会优先读取 Zeabur 设置的环境变量，如果没有则回退到你刚才提供的硬编码
  const API_KEY = getEnv('VITE_MINIMAX_API_KEY') || 'sk-api-Sy6SXYeKULXtll8z482xG_dRBdOjD_VdTD8-pBjm1dVOmi7WbY0dX65uMgBl5LAJDXWYbdFqiwUYYOiQZwyXs8yJDlBOYARqZaOa70r_uAAEdGxpaD5UOA4';
  const GROUP_ID = getEnv('VITE_MINIMAX_GROUP_ID') || '2007418972814713648';
  const VOICE_ID = getEnv('VITE_MINIMAX_VOICE_ID') || 'ttv-voice-2026010417484826-crpUwhCe';

  if (!text) return;

  // 1. 文本清洗
  const cleanedText = text
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .trim();

  if (!cleanedText) return;

  // 2. 构造请求 (直接请求 MiniMax 官网，不走本地代理)
  const url = `https://api.minimax.chat/v1/text_to_speech?GroupId=${GROUP_ID}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "speech-01",
        text: cleanedText,
        voice_id: VOICE_ID,
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
        stream: false
      })
    });

    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

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