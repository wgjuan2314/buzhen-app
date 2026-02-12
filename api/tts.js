/**
 * TTS API Route - Zeabur Serverless Function
 * 后端代理：代表服务器请求 MiniMax API，解决 CORS 问题
 */

export default async function handler(req) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // 从环境变量读取 MiniMax 配置
    const API_KEY = process.env.MINIMAX_API_KEY || process.env.VITE_MINIMAX_API_KEY
    const GROUP_ID = process.env.MINIMAX_GROUP_ID || process.env.VITE_MINIMAX_GROUP_ID || '2007418972814713648'
    const VOICE_ID = process.env.MINIMAX_VOICE_ID || process.env.VITE_MINIMAX_VOICE_ID || 'ttv-voice-2026010417565226-BIc2kWY0'

    if (!API_KEY) {
      console.error('[TTS API] MiniMax API Key 未配置')
      return new Response(
        JSON.stringify({ error: 'MiniMax API Key not configured' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 解析请求体
    const body = await req.json()
    const { text, voice_id, speed = 1.0, vol = 1.0, pitch = 0 } = body

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text parameter is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 使用传入的 voice_id 或默认值
    const finalVoiceId = voice_id || VOICE_ID

    // 构造 MiniMax API 请求
    const minimaxUrl = `https://api.minimax.chat/v1/text_to_speech?GroupId=${GROUP_ID}`

    console.log('[TTS API] 请求 MiniMax API:', {
      url: minimaxUrl,
      voiceId: finalVoiceId,
      textLength: text.length
    })

    // 代表服务器请求 MiniMax API
    const response = await fetch(minimaxUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'speech-01',
        text: text,
        voice_id: finalVoiceId,
        speed: speed,
        vol: vol,
        pitch: pitch,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TTS API] MiniMax API 请求失败:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return new Response(
        JSON.stringify({ 
          error: 'MiniMax API request failed',
          status: response.status,
          details: errorText
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 获取音频 blob
    const audioBlob = await response.blob()

    // 返回音频数据
    return new Response(audioBlob, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('[TTS API] 服务器错误:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
