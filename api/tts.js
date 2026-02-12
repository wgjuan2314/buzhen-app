/**
 * TTS API Route - Zeabur 优化版
 */
export default async function (req, res) {
  // 显式处理跨域（防止某些情况下的二次拦截）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '请使用 POST 请求' });
  }

  try {
    // 自动兼容两种可能的环境变量名
    const API_KEY = process.env.MINIMAX_API_KEY || process.env.VITE_MINIMAX_API_KEY;
    const GROUP_ID = process.env.MINIMAX_GROUP_ID || process.env.VITE_MINIMAX_GROUP_ID || '2007418972814713648';
    
    // 从请求体获取数据，增加兜底解析
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { text, voice_id } = body || {};

    if (!text) return res.status(400).json({ error: '缺少文本内容' });

    const minimaxUrl = `https://api.minimax.chat/v1/text_to_speech?GroupId=${GROUP_ID}`;

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
    // 使用 send 发送 Buffer 数据
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
