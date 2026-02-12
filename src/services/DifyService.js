// DifyService.js
// 防御性 URL 處理：強制去掉末尾斜杠
const rawUrl = import.meta.env.VITE_DIFY_API_URL || 'https://api.dify.ai/v1'
export const BASE_URL = rawUrl.replace(/\/$/, '')

// API Key 處理
const rawApiKey = import.meta.env.VITE_DIFY_API_KEY || ''
export const API_KEY = rawApiKey.trim()

// localStorage key
const CONVERSATION_ID_KEY = 'dify_conversation_id'
const USER_IP_KEY = 'dify_user_ip'
const USER_IP_TIMESTAMP_KEY = 'dify_user_ip_timestamp'

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
  const validUser = typeof user === 'string' && user.trim() ? user.trim() : 'suansuan_user'

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
    response_mode: 'streaming',
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

    // 流式處理：健壯的讀取循環
    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
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
                  // 移除 LOGIN_REQUIRED 相關內容
                  const cleanedDelta = delta.replace(/LOGIN_REQUIRED/gi, '').trim()
                  if (cleanedDelta && onDelta) {
                    try {
                      onDelta(cleanedDelta)
                    } catch (deltaError) {
                      console.warn('[DifyService] onDelta 回調錯誤 (cleaned):', deltaError)
                    }
                  }
                } else {
                  // 正常處理 delta
                  if (onDelta) {
                    try {
                      onDelta(delta)
                    } catch (deltaError) {
                      console.warn('[DifyService] onDelta 回調錯誤:', deltaError)
                    }
                  }
                }
              }
            } catch (parseError) {
              // 忽略無效的 JSON 行（這是正常的，因為流式響應可能包含不完整的數據）
              if (process.env.NODE_ENV === 'development') {
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
