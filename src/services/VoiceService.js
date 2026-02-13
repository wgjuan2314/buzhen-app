/**
 * VoiceService.js - Dify 深度集成版
 * 保持 P0 优先级：适配移动端单例、iOS 物理授权、BGM/语音隔离
 */

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

// 🔒 狀態鎖：確保同一時間只有一個語音任務在操作單例，防止多條語音重疊
let isVoicePlaying = false;

export const unlockAudioContext = () => {
  if (!voiceInstance || !bgmInstance) return;
  console.log("🔊 [VoiceService] 执行全通道静音预热...");
  
  const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A";
  voiceInstance.src = silentSrc;
  bgmInstance.src = silentSrc;
  
  const p1 = voiceInstance.play().then(() => {
    voiceInstance.pause();
    voiceInstance.src = ''; 
  });
  const p2 = bgmInstance.play().then(() => bgmInstance.pause());
  
  Promise.all([p1, p2]).then(() => {
    console.log("✅ [VoiceService] 移动端音频授权成功");
  }).catch(e => console.warn("音频授权受限:", e.message));
};

/**
 * 控制 BGM 狀態 - 確保僅控制 BGM，不干擾 window.yubaiAudio 語音單例
 */
export const setBgmState = (enabled) => {
  if (!bgmInstance) return;
  console.log('🎵 [VoiceService] BGM 狀態切換:', enabled ? '啟動' : '暫停')
  
  if (!bgmInstance.src || bgmInstance.src === '' || bgmInstance.src.includes('data:audio')) {
    bgmInstance.src = '/assets/bgm.mp3';
  }
  
  if (enabled) {
    // 只控制 BGM volume，不影響語音單例
    if (bgmInstance.paused) {
      bgmInstance.volume = 0.2 // BGM 音量固定低音
      bgmInstance.play().catch(e => console.warn('[BGM] 播放失败:', e.message));
    }
  } else {
    bgmInstance.pause();
  }
};

/**
 * 播放 Dify 语音 - 简化版（音频已在 ChatPage 预下载为 Blob）
 */
export async function playDifySpeech(audioContent) {
  if (!audioContent || !voiceInstance) return;
  
  try {
    const audioUrl = typeof audioContent === 'string' 
      ? audioContent 
      : URL.createObjectURL(audioContent);
    
    voiceInstance.pause();
    voiceInstance.muted = false;
    voiceInstance.volume = 1.0;
    voiceInstance.src = audioUrl;
    
    console.log("🎙️ [VoiceService] 播放音频（Blob URL）");
    return await voiceInstance.play();
  } catch (error) {
    console.error('[VoiceService] 播放失败:', error.name, error.message);
    throw error;
  }
}
