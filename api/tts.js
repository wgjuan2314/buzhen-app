/**
 * 优化版 TTS API - 适配 Zeabur 生产环境
 */
export default async function (req, res) {
  // 1. 显式处理跨域（防止请求在服务器层面被拒）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. 处理预检请求 (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. 强制要求 POST 
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '请使用 POST 请求' });
  }

  try {
    // 自动兼容后端与前端混用的变量名
    const API_KEY = process.env.MINIMAX_API_KEY || process.env.VITE_MINIMAX_API_KEY;
    const GROUP_ID = process.env.MINIMAX_GROUP_ID || process.env.VITE_MINIMAX_GROUP_ID || '2007418972814713648';
    
    // 获取请求体数据
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { text, voice_id } = body || {};

    if (!text) return res.status(400).json({ error: '缺少文本内容' });

    const minimaxUrl = `https://api.minimax.chat/v1/text_to_speech?GroupId=${GROUP_ID}`;

    // 服务器端代发请求
    const response = await fetch(minimaxUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'speech-01',
        text: text,
        voice_id: voice_id || 'ttv-voice-2026010417565226-BIc2kWY0',
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).send(errorData);
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    // 直接返回音频 Buffer
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('后端转发失败:', error);
    return res.status(500).json({ error: error.message });
  }
}
