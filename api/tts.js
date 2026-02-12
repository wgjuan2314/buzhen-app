export default async function (req, res) {
  // 显式允许跨域与 POST 方法
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const API_KEY = process.env.MINIMAX_API_KEY || process.env.VITE_MINIMAX_API_KEY;
    const GROUP_ID = process.env.MINIMAX_GROUP_ID || process.env.VITE_MINIMAX_GROUP_ID || '2007418972814713648';

    // 适配 body 解析
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { text, voice_id } = body || {};

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
        speed: 1.0, vol: 1.0, pitch: 0, stream: false
      })
    });

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
