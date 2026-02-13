/**
 * 📢 不枕 (Buzhen) - 语音合成后端函数 (Serverless Function)
 * 适配情况：Zeabur + Node.js 20+
 * 解决问题：405 Method Not Allowed & 环境变量读取
 */

export default async function handler(req, res) {
  // 1. 跨域与方法拦截：这是解决 405 的第一道关口
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理浏览器预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 强制校验 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '请使用 POST 方法请求，当前镜像识别可能存在延迟。' });
  }

  try {
    // 2. 环境变量读取：同时兼容带与不带 VITE_ 前缀的情况
    const API_KEY = process.env.MINIMAX_API_KEY || process.env.VITE_MINIMAX_API_KEY;
    const GROUP_ID = process.env.MINIMAX_GROUP_ID || process.env.VITE_MINIMAX_GROUP_ID;

    // 关键点：如果 Key 没配置，直接返回错误，方便在 Runtime Logs 查看原因
    if (!API_KEY) {
      console.error('❌ [TTS API] 错误：未检测到 MINIMAX_API_KEY，请在 Zeabur 环境变量中配置。');
      return res.status(500).json({ error: '服务器 API Key 未配置' });
    }

    // 3. 请求体解析
    let bodyData;
    try {
      bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      bodyData = req.body;
    }

    const { text, voice_id } = bodyData || {};
    if (!text) {
      return res.status(400).json({ error: '缺少合成文本' });
    }

    console.log(`🎙️ [TTS API] 正在为江予白生成语音，文本长度: ${text.length}`);

    // 4. 调用 MiniMax API
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

    // 5. 转发音频流
    if (!response.ok) {
      const errorMsg = await response.text();
      console.error('❌ [MiniMax API 报错]:', errorMsg);
      return res.status(response.status).json({ error: 'MiniMax 接口调用失败', details: errorMsg });
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // 设置正确的响应头，让前端能识别为音频
    res.setHeader('Content-Type', 'audio/mpeg');
    // 关键：使用 Node.js 的 Buffer 返回二进制数据
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('🔥 [TTS API 崩溃]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}