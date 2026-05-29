// DifyService.js
// 防御性 URL 處理：強制去掉末尾斜杠
const rawUrl = import.meta.env.VITE_DIFY_API_URL || 'https://api.dify.ai/v1'
export const BASE_URL = rawUrl.replace(/\/$/, '')

// API Key 處理
const rawApiKey = import.meta.env.VITE_DIFY_API_KEY || ''
export const API_KEY = rawApiKey.trim()
const RESPONSE_MODE = import.meta.env.VITE_DIFY_RESPONSE_MODE || 'blocking'

// localStorage key
const CONVERSATION_ID_KEY = 'dify_conversation_id'
const USER_IP_KEY = 'dify_user_ip'
const USER_IP_TIMESTAMP_KEY = 'dify_user_ip_timestamp'
const USER_ID_KEY = 'dify_user_id'

// IP 緩存有效期（24小時）
const IP_CACHE_DURATION = 24 * 60 * 60 * 1000

// 獲取持久化的 conversation_id
export const getConversationId = () => {
  try {
    return localStorage.getItem(CONVERSATION_ID_KEY) || null
  } catch {
    return null
  }
}

// 生成或获取用户ID（每个设备唯一且固定）
const getUserId = () => {
  try {
    let userId = localStorage.getItem(USER_ID_KEY)
    if (!userId) {
      // 基于时间戳+随机数+设备特征生成唯一ID
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 8)
      const deviceInfo = navigator.userAgent.slice(0, 20).replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '')
      userId = `user_${deviceInfo}_${timestamp}_${random}`
      localStorage.setItem(USER_ID_KEY, userId)
      console.log('[DifyService] 生成新用户ID:', userId)
    }
    return userId
  } catch {
    // 容错：如果localStorage不可用，返回临时ID
    return `user_temp_${Date.now()}`
  }
}

// 獲取用戶 IP 地址（帶緩存機制）
const getUserIP = async () => {
  try {
    // 檢查緩存
    const cachedIP = localStorage.getItem(USER_IP_KEY)
    const cachedTimestamp = localStorage.getItem(USER_IP_TIMESTAMP_KEY)
    
    if (cachedIP && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10)
      const now = Date.now()
      
      // 如果緩存未過期（24小時內），直接返回緩存的 IP
      if (now - timestamp < IP_CACHE_DURATION) {
        console.log('[DifyService] 使用緩存的用戶 IP:', cachedIP)
        return cachedIP
      }
    }

    // 緩存過期或不存在，重新獲取 IP
    console.log('[DifyService] 正在獲取用戶 IP...')
    
    // 創建超時控制器（兼容性處理）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超時
    
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId) // 清除超時計時器

      if (!response.ok) {
        throw new Error(`IP 獲取失敗: ${response.status}`)
      }

      const data = await response.json()
      const userIP = data.ip

      if (userIP && typeof userIP === 'string') {
        // 保存到緩存
        try {
          localStorage.setItem(USER_IP_KEY, userIP)
          localStorage.setItem(USER_IP_TIMESTAMP_KEY, String(Date.now()))
          console.log('[DifyService] 用戶 IP 獲取成功並已緩存:', userIP)
        } catch (storageError) {
          console.warn('[DifyService] 保存 IP 到緩存失敗:', storageError)
        }
        return userIP
      } else {
        throw new Error('IP 格式無效')
      }
    } catch (fetchError) {
      clearTimeout(timeoutId) // 確保清除超時計時器
      throw fetchError
    }
  } catch (error) {
    console.warn('[DifyService] 獲取用戶 IP 失敗:', error.message)
    
    // 容錯處理：如果獲取失敗，嘗試使用緩存的 IP（即使過期）
    const cachedIP = localStorage.getItem(USER_IP_KEY)
    if (cachedIP) {
      console.log('[DifyService] 使用過期緩存的 IP:', cachedIP)
      return cachedIP
    }
    
    // 如果緩存也沒有，返回默認值
    const defaultIP = '114.248.x.x'
    console.warn('[DifyService] 使用默認 IP:', defaultIP)
    return defaultIP
  }
}

// 保存 conversation_id 到 localStorage
export const saveConversationId = (conversationId) => {
  try {
    if (conversationId) {
      localStorage.setItem(CONVERSATION_ID_KEY, conversationId)
    } else {
      localStorage.removeItem(CONVERSATION_ID_KEY)
    }
  } catch (error) {
    console.error('[DifyService] 保存 conversation_id 失敗:', error)
  }
}

// 隱藏 API Key 用於日誌顯示
const maskApiKey = (key) => {
  if (!key || key.length < 8) return '***'
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

/**
 * 一步到位：支持所有 Dify 返回格式的統一解析（含雙層 JSON 嵌套）
 * 格式 1（推薦）：JSON - {"text":"xxx","audio_url":"yyy"} 或雙層嵌套 {"text":"{\"text\":\"xxx\",\"audio_url\":\"yyy\"}"}
 * 格式 2：標準分隔符 - text=xxx&audio_url=yyy&has_audio=True
 * 格式 3：直接拼接 - text=xxxhttps://yyy 或 text=xxxupload.dify.ai/yyy
 * @returns {{ text: string, audioUrl: string|null, hasAudio: boolean }}
 */
const parseCompositeResponse = (str) => {
  const fallback = { text: '', audioUrl: null, hasAudio: false }
  if (!str || typeof str !== 'string') return fallback
  const s = str.trim()
  let text = ''
  let audioUrl = null
  
  try {
    // ========== 格式 1：JSON（最優先，支持雙層嵌套） ==========
    if (s.startsWith('{')) {
      try {
        const json = JSON.parse(s)
        text = json.text || ''
        audioUrl = json.audio_url || json.audioUrl || null
        
        console.log('[DifyService] 🔍 外層 JSON 解析:', { text: text?.slice(0, 80), audioUrl: audioUrl?.slice(0, 80) })
        
        // 雙層嵌套檢測：如果 text 本身又是 JSON 字符串，再解析一次
        if (text && typeof text === 'string' && text.trim().startsWith('{')) {
          console.log('[DifyService] 🔍 檢測到雙層 JSON，嘗試解析內層...')
          try {
            const innerJson = JSON.parse(text)
            text = innerJson.text || ''
            audioUrl = innerJson.audio_url || innerJson.audioUrl || audioUrl || null
            console.log('[DifyService] ✅ 雙層 JSON 解析成功 - text:', text?.slice(0, 50), 'audioUrl:', audioUrl?.slice(0, 60))
          } catch (innerErr) {
            // 內層解析失敗：不使用外層的 JSON 字符串
            console.warn('[DifyService] ❌ 內層 JSON 解析失敗，清空文本避免顯示 JSON:', innerErr?.message)
            text = ''
            audioUrl = null
          }
        }
        
        // 最終檢查：確保 text 不是 JSON 字符串
        if (text && text.trim().startsWith('{')) {
          console.warn('[DifyService] ⚠️ 提取的 text 仍是 JSON 格式，清空:', text.slice(0, 80))
          text = ''
        }
        
        const hasAudio = !!audioUrl
        console.log('[DifyService] ✅ 最終 JSON 解析結果 - text:', text?.slice(0, 50), 'audioUrl:', audioUrl?.slice(0, 80), 'hasAudio:', hasAudio)
        return { text, audioUrl, hasAudio }
      } catch (jsonErr) {
        console.warn('[DifyService] ❌ JSON 解析失敗，嘗試其他格式:', jsonErr?.message, 'raw:', s.slice(0, 100))
      }
    }
    
    // ========== 格式 2：標準分隔符 text=xxx&audio_url=yyy ==========
    const standardTextMatch = s.match(/text=(.*?)&audio_url=/)
    const standardAudioMatch = s.match(/&audio_url=(.*?)(?:&has_audio=|$)/)
    if (standardTextMatch && standardAudioMatch) {
      text = standardTextMatch[1] || ''
      audioUrl = standardAudioMatch[1] || null
      try { text = decodeURIComponent(text.replace(/\+/g, ' ')) } catch {}
      try { if (audioUrl) audioUrl = decodeURIComponent(audioUrl.replace(/\+/g, ' ')) } catch {}
    } else {
      // ========== 格式 3：直接拼接 text=xxxURL ==========
      const urlWithProtocol = s.match(/text=(.*?)(https?:\/\/[^\s]+\.mp3[^\s]*)/)
      if (urlWithProtocol) {
        text = urlWithProtocol[1] || ''
        audioUrl = urlWithProtocol[2] || null
      } else {
        const urlWithoutProtocol = s.match(/text=(.*?)(upload\.dify\.ai\/files\/[^\s]+\.mp3[^\s]*)/)
        if (urlWithoutProtocol) {
          text = urlWithoutProtocol[1] || ''
          audioUrl = urlWithoutProtocol[2] ? `https://${urlWithoutProtocol[2]}` : null
        } else {
          // 無法解析，返回原始文本（過濾敏感內容）
          text = s.replace(/^text=/, '').replace(/&audio_url=.*$/g, '').replace(/https?:\/\/[^\s]*/g, '').replace(/upload\.dify.ai[^\s]*/g, '').trim()
        }
      }
    }
    
    // 清理文本：移除殘留標記
    if (text) {
      text = text
        .replace(/\s*&has_audio=[^\s&]*/gi, '')
        .replace(/\s*has_audio=[^\s&]*/gi, '')
        .replace(/\s*(True|true|1)\s*$/g, '')
        .trim()
    }
  } catch (parseErr) {
    console.warn('[DifyService] 解析失敗:', parseErr?.message || parseErr, 'raw:', s?.slice(0, 80))
    return fallback
  }
  
  const hasAudio = !!audioUrl
  console.log('[DifyService] 解析結果 - text:', text?.slice(0, 50), 'audioUrl:', audioUrl?.slice(0, 80), 'hasAudio:', hasAudio)
  return { text, audioUrl, hasAudio }
}

/** URL 合法性檢查：必須以 http 開頭且包含 .mp3，否則不觸發播放 */
const isAudioUrlValid = (url) => {
  if (!url || typeof url !== 'string') return false
  const u = url.trim()
  return (u.startsWith('http://') || u.startsWith('https://')) && u.includes('.mp3')
}

/** 補全相對路徑為絕對 URL（使用 BASE_URL 的 origin，默認 https://api.dify.ai） */
const completeAudioUrl = (url) => {
  if (!url || typeof url !== 'string') return null
  const u = url.trim()
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  try {
    const baseOrigin = BASE_URL && BASE_URL.startsWith('http') ? new URL(BASE_URL).origin : 'https://api.dify.ai'
    return baseOrigin + (u.startsWith('/') ? u : '/' + u)
  } catch {
    return 'https://api.dify.ai' + (u.startsWith('/') ? u : '/' + u)
  }
}

/** 安全觸發 onAudio：先檢查 URL 合法性，並 console.log 完整 URL */
const safeTriggerOnAudio = (audioUrl, onAudio) => {
  if (!onAudio || !audioUrl) return
  console.log('🔗 提取到的完整URL:', audioUrl)
  if (!isAudioUrlValid(audioUrl)) {
    console.warn('[DifyService] URL 不合法，跳過播放:', audioUrl?.slice(0, 80))
    return
  }
  try {
    onAudio(audioUrl)
  } catch (e) {
    console.warn('[DifyService] onAudio 回調錯誤:', e)
  }
}

/** 安全觸發 onVoiceReady：URL 補全後立即回調，不等待文本傳輸完成 */
const safeTriggerOnVoiceReady = (audioUrl, onVoiceReady) => {
  if (!onVoiceReady || !audioUrl) return
  const fullUrl = completeAudioUrl(audioUrl)
  if (!fullUrl || !isAudioUrlValid(fullUrl)) {
    console.warn('[DifyService] onVoiceReady URL 不合法，跳過:', audioUrl?.slice(0, 80))
    return
  }
  console.log('🔗 [onVoiceReady] 即時回調 URL:', fullUrl)
  try {
    onVoiceReady(fullUrl)
  } catch (e) {
    console.warn('[DifyService] onVoiceReady 回調錯誤:', e)
  }
}

/** 檢測是否為複合格式（用於流式緩衝），一步到位支持所有格式 */
const looksLikeComposite = (str) => {
  if (!str || typeof str !== 'string') return false
  const s = str.trim()
  // 格式 1：JSON - 任何以 { 開頭的都可能是 JSON（即使還不完整）
  if (s.startsWith('{')) return true
  // 格式 2：標準分隔符 - text=xxx&audio_url=yyy
  if (s.includes('text=') && (s.includes('&audio_url=') || s.includes('&has_audio='))) return true
  // 格式 3：直接拼接 - text=xxxURL
  if (s.includes('text=') && (s.includes('https://') || s.includes('http://') || s.includes('upload.dify.ai') || s.includes('.mp3'))) return true
  // 可能是複合格式的開頭
  if (s.startsWith('text=')) return true
  return false
}

const pickFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const extractWorkflowPayload = (outputs) => {
  if (!outputs || typeof outputs !== 'object') return { text: '', audioUrl: null }

  const text = pickFirstString(
    outputs.text,
    outputs.answer,
    outputs.response,
    outputs.output,
    outputs.result,
    outputs.final_answer,
    outputs.message,
  )
  const audioUrl = pickFirstString(outputs.audio_url, outputs.audioUrl, outputs.audio, outputs.url) || null

  return { text, audioUrl }
}

const extractAnswerPayload = (answer) => {
  if (typeof answer !== 'string') return { text: '', audioUrl: null }

  const audioUrlPattern = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'*+,;=%]+?\.mp3[A-Za-z0-9\-._~:/?#[\]@!$&'*+,;=%]*/i
  const audioMatch = answer.match(audioUrlPattern)
  const audioUrl = audioMatch ? audioMatch[0] : null
  const text = answer
    .replace(new RegExp(audioUrlPattern.source, 'gi'), '')
    .replace(/\s+/g, ' ')
    .trim()

  return { text, audioUrl }
}

export const streamChat = async ({
  query,
  conversationId,
  user = getUserId(),
  inputs = {},
  onDelta,
  onMeta,
  onLoginRequired,
  onAudio,
  onVoiceReady,
  signal,
}) => {
  let visibleContentReceived = false
  const originalOnDelta = onDelta
  onDelta = (text) => {
    if (typeof text === 'string' && text.trim()) {
      visibleContentReceived = true
    }
    if (originalOnDelta) originalOnDelta(text)
  }

  // Body 校驗：確保 query 是有效字串
  let queryText = ''
  if (typeof query === 'string' && query.trim()) {
    queryText = query.trim()
  } else if (typeof query?.query === 'string' && query.query.trim()) {
    queryText = query.query.trim()
  } else if (query) {
    queryText = String(query)
  }

  if (!queryText) {
    const error = new Error('[DifyService] query 參數無效或為空')
    console.error(error)
    throw error
  }

  // Body 校驗：確保 user 有有效值
  const validUser = typeof user === 'string' && user.trim() ? user.trim() : getUserId()

  // 從 localStorage 獲取 conversation_id（優先使用傳入的，否則從 localStorage 獲取）
  const persistedConversationId = conversationId || getConversationId()

  // 獲取用戶 IP（帶緩存和容錯處理）
  const userIP = await getUserIP()

  // 構建完整的請求 URL
  const requestUrl = `${BASE_URL}/chat-messages`

  // 構建請求體
  const requestBody = {
    inputs: {
      total_rounds: 0,
      is_logged_in: true,
      user_ip: userIP, // 添加用戶 IP 字段，供 Dify 後端天氣插件使用
      ...inputs,
    },
    query: queryText,
    response_mode: RESPONSE_MODE,
    user: validUser,
  }

  // 只有在有 conversation_id 時才添加
  if (persistedConversationId) {
    requestBody.conversation_id = persistedConversationId
  }

  // 健壯的 Headers：確保 Authorization 使用 trim 後的 API_KEY
  const headers = {
    'Content-Type': 'application/json',
  }

  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`
  } else {
    const error = new Error('[DifyService] API_KEY 未配置')
    console.error(error)
    throw error
  }

  // 詳細日誌（隱藏敏感信息）
  console.log('[DifyService] 發起請求:', {
    url: requestUrl,
    method: 'POST',
    hasApiKey: !!API_KEY,
    maskedApiKey: maskApiKey(API_KEY),
    conversationId: persistedConversationId || '新會話',
    queryLength: queryText.length,
    user: validUser,
  })

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal,
    })

    // 錯誤處理：詳細的錯誤日誌
    if (!response.ok) {
      const raw = await response.text().catch(() => '')
      let parsed = raw
      try {
        parsed = raw ? JSON.parse(raw) : raw
      } catch {
        // keep raw text
      }

      const errorMessage = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
      const error = new Error(`Dify API 錯誤 ${response.status}: ${errorMessage}`)

      // 詳細錯誤日誌（隱藏敏感信息）
      console.error('[DifyService] 請求失敗:', {
        status: response.status,
        statusText: response.statusText,
        url: requestUrl,
        maskedApiKey: maskApiKey(API_KEY),
        error: errorMessage,
        responseHeaders: Object.fromEntries(response.headers.entries()),
      })

      // 【臨時修復】404 錯誤時清除 conversation_id，解決更換 API 後的緩存問題
      if (response.status === 404) {
        console.warn('[DifyService] 檢測到 404 錯誤，清除 conversation_id 緩存')
        saveConversationId(null) // 清除 conversation_id
      }

      throw error
    }

    if (requestBody.response_mode === 'blocking') {
      const json = await response.json()

      if (json.conversation_id) {
        saveConversationId(json.conversation_id)
      }

      if (onMeta) {
        try {
          onMeta(json)
        } catch (metaError) {
          console.warn('[DifyService] onMeta 回調錯誤:', metaError)
        }
      }

      const payload = extractAnswerPayload(json.answer)
      if (payload.audioUrl) {
        safeTriggerOnVoiceReady(payload.audioUrl, onVoiceReady)
        safeTriggerOnAudio(completeAudioUrl(payload.audioUrl) || payload.audioUrl, onAudio)
      }
      if (payload.text && onDelta) {
        try { onDelta(payload.text) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
      }

      if (!payload.text) {
        throw new Error('Dify blocking 響應沒有返回可顯示文本。')
      }

      return
    }

    // 流式處理：確保 response.body 存在
    if (!response.body) {
      const error = new Error('[DifyService] 當前環境不支持流式響應 (response.body 為空)')
      console.error('[DifyService] 流式響應檢查失敗:', {
        url: requestUrl,
        hasBody: !!response.body,
        responseType: response.type,
      })
      throw error
    }

    // 流式處理：確保 getReader 可用
    let reader
    try {
      reader = response.body.getReader()
    } catch (readerError) {
      const error = new Error(`[DifyService] 無法獲取流式讀取器: ${readerError.message}`)
      console.error('[DifyService] getReader 失敗:', {
        url: requestUrl,
        error: readerError.message,
        stack: readerError.stack,
      })
      throw error
    }

    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let currentConversationId = persistedConversationId
    let loginRequiredDetected = false
    let accumulatedContent = '' // 累積內容，用於檢查 LOGIN_REQUIRED
    let compositeBuffer = '' // 複合格式緩衝（text=&audio_url=&has_audio=）
    let jsonDeltaBuffer = '' // 流式 JSON 片段緩衝，確保完整後再 JSON.parse
    let voiceReadyFired = false // 本輪是否已觸發 onVoiceReady，避免重複

    // 流式處理：健壯的讀取循環
    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          // 流結束時先刷新 JSON buffer（確保 192 環境下未完整傳完的 JSON 也能解析）
          if (jsonDeltaBuffer) {
            try {
              const parsed = JSON.parse(jsonDeltaBuffer)
              let safeText = (parsed.text ?? parsed.answer ?? '').trim()
              let audioUrl = parsed.audio_url ?? parsed.audioUrl ?? null
              if (typeof safeText === 'string' && safeText.startsWith('{')) {
                try {
                  const inner = JSON.parse(safeText)
                  safeText = (inner.text ?? inner.answer ?? '').trim()
                  audioUrl = inner.audio_url ?? inner.audioUrl ?? audioUrl
                } catch (_) {}
              }
              if (audioUrl && !voiceReadyFired) safeTriggerOnVoiceReady(audioUrl, onVoiceReady)
              if (audioUrl && onAudio) safeTriggerOnAudio(completeAudioUrl(audioUrl) || audioUrl, onAudio)
              if (safeText && onDelta) {
                try { onDelta(safeText) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
              }
            } catch (_) {
              const parsed = parseCompositeResponse(jsonDeltaBuffer)
              if (parsed.audioUrl && !voiceReadyFired) safeTriggerOnVoiceReady(parsed.audioUrl, onVoiceReady)
              if (parsed.audioUrl && onAudio) safeTriggerOnAudio(parsed.audioUrl, onAudio)
              if (parsed.text && onDelta) {
                try { onDelta(parsed.text) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
              }
            }
            jsonDeltaBuffer = ''
          }
          // 流結束時處理未完成的複合格式緩衝
          if (compositeBuffer) {
            console.log('[DifyService] 流結束時刷新 compositeBuffer:', compositeBuffer.slice(0, 100))
            const parsed = parseCompositeResponse(compositeBuffer)
            const safeText = parsed.text || ''
            if (parsed.audioUrl && !voiceReadyFired) safeTriggerOnVoiceReady(parsed.audioUrl, onVoiceReady)
            if (safeText && onDelta) {
              try { onDelta(safeText) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
            }
            if (parsed.audioUrl && onAudio) safeTriggerOnAudio(parsed.audioUrl, onAudio)
            compositeBuffer = ''
          }
          console.log('[DifyService] 流式響應完成')
          break
        }

        if (!value) {
          console.warn('[DifyService] 讀取到空值，繼續等待...')
          continue
        }

        try {
          buffer += decoder.decode(value, { stream: true })
        } catch (decodeError) {
          console.warn('[DifyService] 解碼錯誤:', decodeError)
          continue
        }

        const chunks = buffer.split(/\n\n/)
        buffer = chunks.pop() || ''

        for (const chunk of chunks) {
          const lines = chunk.split(/\n/)
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue

            const data = trimmed.replace(/^data:\s?/, '')
            if (!data || data === '[DONE]') continue

            try {
              const json = JSON.parse(data)

              // 處理 metadata：保存 conversation_id 和打印會話輪數
              if (json.conversation_id && json.conversation_id !== currentConversationId) {
                currentConversationId = json.conversation_id
                saveConversationId(currentConversationId)
                console.log('[DifyService] 新會話已創建，conversation_id:', currentConversationId)
              }

              // 打印會話輪數
              if (json.metadata?.rounds !== undefined) {
                console.log(`[Dify] 當前會話輪數計數: ${json.metadata.rounds}`)
              }

              // 調用 onMeta 回調
              if (onMeta) {
                try {
                  onMeta(json)
                } catch (metaError) {
                  console.warn('[DifyService] onMeta 回調錯誤:', metaError)
                }
              }

              if (json.event === 'workflow_finished' || json.event === 'node_finished') {
                const status = json.data?.status
                const workflowError = json.data?.error
                if (status === 'failed' || workflowError) {
                  throw new Error(`Dify 工作流失敗: ${workflowError || '未知錯誤'}`)
                }
              }

              if (json.event === 'workflow_finished') {
                const payload = extractWorkflowPayload(json.data?.outputs)
                if (payload.audioUrl && !voiceReadyFired) {
                  safeTriggerOnVoiceReady(payload.audioUrl, onVoiceReady)
                  voiceReadyFired = true
                }
                if (payload.audioUrl && onAudio) {
                  safeTriggerOnAudio(completeAudioUrl(payload.audioUrl) || payload.audioUrl, onAudio)
                }
                if (payload.text && onDelta) {
                  try { onDelta(payload.text) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
                }
              }

              // 捕獲 Dify 內置 TTS 音頻輸出
              if (onAudio) {
                const audioData = json.audio ?? json.audio_url ?? json.message?.audio ?? json.data?.audio
                if (audioData) {
                  try {
                    let audioContent
                    if (typeof audioData === 'string') {
                      if (audioData.startsWith('http')) {
                        audioContent = audioData
                      } else {
                        const binary = atob(audioData)
                        const bytes = new Uint8Array(binary.length)
                        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
                        audioContent = new Blob([bytes], { type: 'audio/mpeg' })
                      }
                    } else if (audioData instanceof Blob) {
                      audioContent = audioData
                    }
                    if (audioContent) {
                      if (typeof audioContent === 'string') {
                        safeTriggerOnAudio(audioContent, onAudio)
                      } else {
                        onAudio(audioContent)
                      }
                    }
                  } catch (audioError) {
                    console.warn('[DifyService] 音頻解析錯誤:', audioError)
                  }
                }
              }

              // 提取 delta 內容
              const delta = json.answer ?? json.delta ?? json.text
              if (typeof delta === 'string' && delta.length) {
                accumulatedContent += delta

                // 【192 環境修復】JSON 流式 buffer：僅在 JSON 完整後才 parse，解析出 audio_url 立即 onVoiceReady
                const isJsonStart = delta.trim().startsWith('{')
                if (jsonDeltaBuffer || isJsonStart) {
                  jsonDeltaBuffer += delta
                  let parsed = null
                  try {
                    parsed = JSON.parse(jsonDeltaBuffer)
                  } catch (_) {
                    // 不完整，繼續累積
                    continue
                  }
                  // 完整 JSON 解析成功
                  let safeText = (parsed.text ?? parsed.answer ?? '').trim()
                  let audioUrl = parsed.audio_url ?? parsed.audioUrl ?? null
                  if (typeof safeText === 'string' && safeText.startsWith('{')) {
                    try {
                      const inner = JSON.parse(safeText)
                      safeText = (inner.text ?? inner.answer ?? '').trim()
                      audioUrl = inner.audio_url ?? inner.audioUrl ?? audioUrl
                    } catch (_) {}
                  }
                  // 即時回調：一旦有 audio_url 立即傳出，不等待文本傳完
                  if (audioUrl && !voiceReadyFired) {
                    safeTriggerOnVoiceReady(audioUrl, onVoiceReady)
                    voiceReadyFired = true
                  }
                  if (onAudio && audioUrl) safeTriggerOnAudio(completeAudioUrl(audioUrl) || audioUrl, onAudio)
                  const isCleanText = safeText && !safeText.includes('"text"') && !safeText.includes('"audio_url"')
                  if (isCleanText && onDelta) {
                    try { onDelta(safeText) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
                  }
                  jsonDeltaBuffer = ''
                  continue
                }

                // 複合格式處理（非 JSON）：標準分隔符、直接拼接
                if (compositeBuffer) {
                  compositeBuffer += delta
                  const parsed = parseCompositeResponse(compositeBuffer)
                  const safeText = parsed.text || ''
                  const isJsonComplete = compositeBuffer.trim().startsWith('{') && compositeBuffer.trim().endsWith('}')
                  if (isJsonComplete || (safeText.length > 0 && !safeText.includes('"'))) {
                    if (parsed.audioUrl && !voiceReadyFired) {
                      safeTriggerOnVoiceReady(parsed.audioUrl, onVoiceReady)
                      voiceReadyFired = true
                    }
                    if (parsed.audioUrl) safeTriggerOnAudio(parsed.audioUrl, onAudio)
                    if (safeText && onDelta) {
                      try { onDelta(safeText) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
                    }
                    compositeBuffer = ''
                  }
                  continue
                }
                if (looksLikeComposite(delta) && !delta.trim().startsWith('{')) {
                  compositeBuffer = delta
                  const parsed = parseCompositeResponse(compositeBuffer)
                  const safeText = parsed.text || ''
                  if (parsed.audioUrl && !voiceReadyFired) {
                    safeTriggerOnVoiceReady(parsed.audioUrl, onVoiceReady)
                    voiceReadyFired = true
                  }
                  if (parsed.audioUrl) safeTriggerOnAudio(parsed.audioUrl, onAudio)
                  if (safeText && onDelta) {
                    try { onDelta(safeText) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
                  }
                  if (safeText || parsed.audioUrl) compositeBuffer = ''
                  continue
                }

                // 檢查是否包含 LOGIN_REQUIRED 攔截信號
                if (accumulatedContent.includes('LOGIN_REQUIRED') && !loginRequiredDetected) {
                  loginRequiredDetected = true
                  console.warn('[DifyService] 檢測到登錄攔截信號: LOGIN_REQUIRED')

                  // 調用登錄提示回調
                  if (onLoginRequired) {
                    try {
                      onLoginRequired()
                    } catch (loginError) {
                      console.warn('[DifyService] onLoginRequired 回調錯誤:', loginError)
                    }
                  } else {
                    // 如果沒有提供回調，觸發全局事件
                    try {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('dify:login-required'))
                      }
                    } catch (eventError) {
                      console.warn('[DifyService] 觸發全局事件失敗:', eventError)
                    }
                  }

                  // 不將 LOGIN_REQUIRED 內容顯示在聊天氣泡中
                  continue
                }

                // 如果已經檢測到登錄要求，過濾掉相關內容
                if (loginRequiredDetected) {
                  const cleanedDelta = filterSensitiveSuffix(delta.replace(/LOGIN_REQUIRED/gi, ''))
                  if (cleanedDelta && onDelta) {
                    try { onDelta(cleanedDelta) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
                  }
                } else {
                  // 正常處理：最後保護，確保不傳遞任何 JSON 片段
                  const hasJsonMarkers = delta.includes('{') || delta.includes('}') || 
                    delta.includes('"text"') || delta.includes('"audio_url"') ||
                    delta.includes('":"') || delta.includes(',"')
                  if (hasJsonMarkers) {
                    console.warn('[DifyService] ⚠️ 檢測到 JSON 標記，跳過:', delta.slice(0, 80))
                    continue
                  }
                  // 純文本，正常傳遞
                  if (delta && onDelta) {
                    try { onDelta(delta) } catch (e) { console.warn('[DifyService] onDelta 回調錯誤:', e) }
                  }
                }
              }
            } catch (parseError) {
              // 忽略無效的 JSON 行（這是正常的，因為流式響應可能包含不完整的數據）
              if (import.meta.env.DEV) {
                console.debug('[DifyService] JSON 解析跳過:', parseError.message)
              }
            }
          }
        }
      }
    } catch (readError) {
      console.error('[DifyService] 流式讀取錯誤:', {
        error: readError.message,
        stack: readError.stack,
        url: requestUrl,
      })
      throw new Error(`流式讀取失敗: ${readError.message}`)
    } finally {
      // 確保讀取器被正確釋放
      try {
        if (reader) {
          reader.releaseLock()
        }
      } catch (releaseError) {
        console.warn('[DifyService] 釋放讀取器失敗:', releaseError)
      }
    }

    // 流式響應結束後，確保 conversation_id 已保存
    if (currentConversationId && currentConversationId !== persistedConversationId) {
      saveConversationId(currentConversationId)
    }

    if (!visibleContentReceived && !loginRequiredDetected) {
      throw new Error('Dify 工作流沒有返回可顯示文本，請檢查 Dify 後台工作流輸出或代碼節點錯誤。')
    }
  } catch (error) {
    // 詳細錯誤捕獲：打印完整的請求信息（隱藏敏感信息）
    console.error('[DifyService] 請求異常:', {
      error: error.message,
      stack: error.stack,
      url: requestUrl,
      maskedApiKey: maskApiKey(API_KEY),
      baseUrl: BASE_URL,
      hasSignal: !!signal,
      signalAborted: signal?.aborted || false,
    })

    // 重新拋出錯誤，讓調用者處理
    throw error
  }
}
