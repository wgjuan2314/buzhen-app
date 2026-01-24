// DifyService.js
export const API_KEY = import.meta.env.VITE_DIFY_API_KEY;
export const BASE_URL = import.meta.env.VITE_DIFY_API_URL || 'https://api.dify.ai/v1'; 

// localStorage key
const CONVERSATION_ID_KEY = 'dify_conversation_id'

// 獲取持久化的 conversation_id
export const getConversationId = () => {
  try {
    return localStorage.getItem(CONVERSATION_ID_KEY) || null
  } catch {
    return null
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

export const streamChat = async ({
  query,
  conversationId,
  user = 'suansuan_user',
  inputs = {},
  onDelta,
  onMeta,
  onLoginRequired,
  signal,
}) => {
  // 確保 query 是純字串
  const queryText =
    typeof query === 'string'
      ? query
      : typeof query?.query === 'string'
        ? query.query
        : JSON.stringify(query)

  // 從 localStorage 獲取 conversation_id（優先使用傳入的，否則從 localStorage 獲取）
  const persistedConversationId = conversationId || getConversationId()
  
  console.log('[DifyService] 當前 conversation_id:', persistedConversationId || '新會話')

  const response = await fetch(`${BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        total_rounds: 0,
        is_logged_in: true,
        ...inputs,
      },
      query: queryText,
      response_mode: 'streaming',
      conversation_id: persistedConversationId || undefined,
      user,
    }),
    signal,
  })

  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    let parsed = raw
    try {
      parsed = raw ? JSON.parse(raw) : raw
    } catch {
      // keep raw text
    }
    throw new Error(
      `Dify error ${response.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`,
    )
  }

  if (!response.body) throw new Error('Streaming not supported in this environment')

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let currentConversationId = persistedConversationId
  let loginRequiredDetected = false
  let accumulatedContent = '' // 累積內容，用於檢查 LOGIN_REQUIRED

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

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
          onMeta?.(json)
          
          // 提取 delta 內容
          const delta = json.answer ?? json.delta ?? json.text
          if (typeof delta === 'string' && delta.length) {
            accumulatedContent += delta
            
            // 檢查是否包含 LOGIN_REQUIRED 攔截信號
            if (accumulatedContent.includes('LOGIN_REQUIRED') && !loginRequiredDetected) {
              loginRequiredDetected = true
              console.warn('[DifyService] 檢測到登錄攔截信號: LOGIN_REQUIRED')
              
              // 調用登錄提示回調
              if (onLoginRequired) {
                onLoginRequired()
              } else {
                // 如果沒有提供回調，觸發全局事件
                window.dispatchEvent(new CustomEvent('dify:login-required'))
              }
              
              // 不將 LOGIN_REQUIRED 內容顯示在聊天氣泡中
              continue
            }
            
            // 如果已經檢測到登錄要求，過濾掉相關內容
            if (loginRequiredDetected) {
              // 移除 LOGIN_REQUIRED 相關內容
              const cleanedDelta = delta.replace(/LOGIN_REQUIRED/gi, '').trim()
              if (cleanedDelta && onDelta) {
                onDelta(cleanedDelta)
              }
            } else {
              // 正常處理 delta
              if (onDelta) onDelta(delta)
            }
          }
        } catch {
          // ignore bad json line
        }
      }
    }
  }
  
  // 流式響應結束後，確保 conversation_id 已保存
  if (currentConversationId && currentConversationId !== persistedConversationId) {
    saveConversationId(currentConversationId)
  }
}