/**
 * 终极全栈适配版 - 解决 Zeabur 405 报错并支持全环境变量读取
 */
export default async function handler(req, res) {
  // 1. 跨域与方法安全拦截
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 强制校验 POST，防止被当作静态文件 GET 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '请使用 POST 方法请求语音接口' });
  }

  try {
    // 2. 环境变量双重读取逻辑 (优先读取后端私有 Key)
    const API_KEY = process.env.MINIMAX_API_KEY || process.env.VITE_MINIMAX_API_KEY;
    const GROUP_ID = process.env.MINIMAX_GROUP_ID || process.env.VITE_MINIMAX_GROUP_ID;

    if (!API_KEY) {
      throw new Error('未检测到 MINIMAX_API_KEY，请检查 Zeabur 环境变量配置');
    }

    // 3. 健壮的 Body 解析
    let bodyData;
    try {
      bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      bodyData = req.body;
    }

    const { text, voice_id } = bodyData || {};
    if (!text) {
      return res.status(400).json({ error: '缺少合成文本 (text)' });
    }

    // 4. 发起 MiniMax 官方 API 请求
    const response = await fetch(`https://api.minimax.chat/v1/text_to_speech?GroupId=${GROUP_ID}`, {
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

    // 5. 错误处理与流转发
    if (!response.ok) {
      const errorMsg = await response.text();
      console.error('[MiniMax Error]:', errorMsg);
      return res.status(response.status).json({ error: 'MiniMax 接口调用失败', details: errorMsg });
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // 设置音频响应头
    res.setHeader('Content-Type', 'audio/mpeg');
    // 将 Buffer 传回给前端 VoiceService
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('[Server Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}