// MiniMax TTS 配置 - 核心參數
const API_KEY = 'sk-api-Sy6SXYeKULXtll8z482xG_dRBdOjD_VdTD8-pBjm1dVOmi7WbY0dX65uMgBl5LAJDXWYbdFqiwUYYOiQZwyXs8yJDlBOYARqZaOa70r_uAAEdGxpaD5UOA4'
const GROUP_ID = '2007418972814713648'
const VOICE_ID = 'ttv-voice-2026010417484826-crpUwhCe'

/**
 * 終極修復版：生成語音並返回 Audio 對象
 */
export async function generateSpeech(text) {
  if (!text) throw new Error('文本不能為空');

  // 1. 升級文本清洗：同時過濾全角括號（）和半角括號()及其內部內容
  let cleanedText = text
    .replace(/\([^)]*\)/g, '')  // 移除半角括號 (动作描述)
    .replace(/（[^）]*）/g, '')  // 移除全角括號 （动作描述）
    .trim();  // 優化清洗邏輯：清除多餘的空格

  // 兜底方案：如果清洗後的文本變為空字符串（即整句話全是動作描寫），則跳過本次語音生成
  if (!cleanedText || cleanedText.length === 0) {
    console.log('[VoiceService] 清洗後文本為空，跳過語音生成')
    throw new Error('文本清洗後為空，跳過語音生成')
  }

  // 2. 構建最穩健的扁平 Body（解決 2013 empty field 關鍵）
  const requestBody = {
    model: "speech-01",
    text: cleanedText,
    voice_id: VOICE_ID, // 移出嵌套，放至頂層
    speed: 1.0,
    vol: 2.0, // 最大音量
    pitch: 0,
    stream: false
  };

  // 3. 使用標准接口路徑
  const url = `/minimax-api/v1/text_to_speech?GroupId=${GROUP_ID}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // 4. 深度驗證響應
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`服務器報錯 ${response.status}: ${errText}`);
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const jsonData = await response.json();
      // 如果狀態碼不是 0，說明 MiniMax 內部報錯了
      if (jsonData.base_resp && jsonData.base_resp.status_code !== 0) {
        throw new Error(JSON.stringify(jsonData.base_resp));
      }
    }

    // 5. 轉換為音頻並播放
    const blob = await response.blob();
    if (blob.size < 100) throw new Error('生成的音頻文件過小，可能無效');
    
    const audioUrl = URL.createObjectURL(new Blob([blob], { type: 'audio/mpeg' }));
    return new Audio(audioUrl);

  } catch (error) {
    console.error('[VoiceService] 失敗:', error.message);
    throw error;
  }
}