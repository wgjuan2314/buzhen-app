import { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Settings, CirclePlus, Play, Mic, Keyboard, Send } from 'lucide-react'
import { streamChat } from '../services/DifyService'
import { generateSpeech, setBgmState } from '../services/VoiceService'
import IntroCard from './IntroCard'
import avatarImg from '../assets/avatar.jpg'
import { useChatStore } from '../store/chatStore'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// 獲取階段進度百分比
function getStageProgress(rawStageName) {
  const stage = String(rawStageName || '').toLowerCase().trim()
  
  if (stage === 'stage_1' || stage === 'initial') return 33
  if (stage === 'stage_2') return 66
  if (stage === 'stage_3') return 100
  
  return 33 // 默認值
}

// 等級階梯定義
const INTIMACY_LEVELS = [
  { level: 0, start: 0, target: 10 },      // Lv.0: 0-9 轮 (目标: 10)
  { level: 1, start: 10, target: 40 },     // Lv.1: 10-39 轮 (目标: 40)
  { level: 2, start: 40, target: 80 },    // Lv.2: 40-79 轮 (目标: 80)
  { level: 3, start: 80, target: 150 },    // Lv.3: 80-149 轮 (目标: 150)
  { level: 4, start: 150, target: 200 },  // Lv.4: 150-199 轮 (目标: 200)
  { level: 5, start: 200, target: 200 },  // Lv.5: 200+ 轮 (已达上限)
]

// 根據總對話輪數獲取當前等級信息
function getIntimacyLevelInfo(totalTurns) {
  // 從高到低查找第一個符合條件的等級
  for (let i = INTIMACY_LEVELS.length - 1; i >= 0; i--) {
    const levelInfo = INTIMACY_LEVELS[i]
    if (totalTurns >= levelInfo.start) {
      return levelInfo
    }
  }
  // 默認返回 Lv.0
  return INTIMACY_LEVELS[0]
}

// 計算當前等級（用於顯示）
function getIntimacyLevel(totalTurns) {
  return getIntimacyLevelInfo(totalTurns).level
}

// 計算當前等級內的進度百分比
function getIntimacyProgressPercent(totalTurns) {
  const levelInfo = getIntimacyLevelInfo(totalTurns)
  const { start, target } = levelInfo
  
  // 如果已達上限（Lv.5），進度條顯示 100%
  if (levelInfo.level === 5) {
    return 100
  }
  
  // 計算進度百分比：(totalTurns - 當前等級起始輪數) / (目標輪數 - 當前等級起始輪數) * 100%
  const progress = totalTurns - start
  const range = target - start
  if (range <= 0) return 100
  
  return Math.min((progress / range) * 100, 100)
}

// 獲取情感階段文案（預留）
function getIntimacyStageText(level) {
  if (level <= 2) return '初识'
  if (level <= 4) return '熟悉'
  return '暧昧'
}

// 檢測文本是否為單行（簡單判斷：無換行符且字符數較少）
function isSingleLine(text) {
  if (!text) return false
  // 移除括號內容後計算長度
  const cleanedText = text.replace(/[（(][^）)]+[）)]/g, '').trim()
  // 無換行符且字符數少於或等於 15 個字符視為單行
  return !cleanedText.includes('\n') && cleanedText.length <= 15
}

// 計算語音時長（根據文本長度預估）
function estimateVoiceDuration(text) {
  if (!text) return 2
  // 移除括號內容
  const cleanedText = text.replace(/[（(][^）)]+[）)]/g, '').trim()
  // 假設每秒讀 4 個字，最低 2 秒
  return Math.max(2, Math.ceil(cleanedText.length / 4))
}

// 處理括號內容顏色（將括號內容渲染為更淡的顏色）
function renderTextWithBrackets(text, isUser = false) {
  if (!text) return text
  
  // 匹配全角和半角括號及其內容
  const bracketRegex = /([（(])([^）)]+)([）)])/g
  const parts = []
  let lastIndex = 0
  let match
  
  while ((match = bracketRegex.exec(text)) !== null) {
    // 添加括號前的文本
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isBracket: false })
    }
    // 添加括號內容（包括括號本身）
    parts.push({ text: match[0], isBracket: true })
    lastIndex = match.index + match[0].length
  }
  
  // 添加剩餘文本
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isBracket: false })
  }
  
  // 如果沒有匹配到括號，返回原文本
  if (parts.length === 0) {
    return <span>{text}</span>
  }
  
  // 根據消息類型選擇顏色
  const bracketColor = isUser ? 'text-[#1A1A1A]/60' : 'text-white/60'
  
  return (
    <>
      {parts.map((part, index) => (
        <span key={index} className={part.isBracket ? bracketColor : ''}>
          {part.text}
        </span>
      ))}
    </>
  )
}

// Typewriter 組件：實現流式打字機效果
function Typewriter({ text, onComplete, onProgress, isUser = false }) {
  const [displayedText, setDisplayedText] = useState('')
  const timeoutRef = useRef(null)
  const indexRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const onProgressRef = useRef(onProgress)

  // 更新 ref 以確保使用最新的回調
  useEffect(() => {
    onCompleteRef.current = onComplete
    onProgressRef.current = onProgress
  }, [onComplete, onProgress])

  useEffect(() => {
    // 重置狀態
    setDisplayedText('')
    indexRef.current = 0

    // 如果沒有文字，直接完成
    if (!text || text.length === 0) {
      if (onCompleteRef.current) {
        onCompleteRef.current()
      }
      return
    }

    const typeNextChar = () => {
      if (indexRef.current >= text.length) {
        if (onCompleteRef.current) {
          // 延遲一點點確保最後一個字符已顯示
          setTimeout(() => {
            onCompleteRef.current()
          }, 50)
        }
        return
      }

      const char = text[indexRef.current]
      const newText = text.slice(0, indexRef.current + 1)
      setDisplayedText(newText)
      indexRef.current++

      // 觸發進度回調（用於實時滾動）
      if (onProgressRef.current) {
        onProgressRef.current(newText)
      }

      // 計算延遲時間
      let delay = 40 // 默認每字 40ms
      
      // 標點符號增加 100ms 停頓
      if (/[，。！？、；：]/.test(char)) {
        delay += 100
      }

      timeoutRef.current = setTimeout(typeNextChar, delay)
    }

    // 開始打字
    typeNextChar()

    // 清理函數
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text])

  // 渲染文字（帶括號顏色處理）
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {renderTextWithBrackets(displayedText, isUser)}
    </motion.span>
  )
}

const ChatPage = forwardRef(function ChatPage({ onAutoGreeting, isMuted, toggleMute }, ref) {
  const { t, i18n } = useTranslation()
  // 從 Zustand Store 獲取對話輪數
  const chatTurns = useChatStore((state) => state.chatTurns)
  const incrementTurns = useChatStore((state) => state.incrementTurns)
  
  const [rawStageName, setRawStageName] = useState('stage_1') // 從 Dify 獲取的原始 stage_name
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [messages, setMessages] = useState([])
  const [hasTriggeredGreeting, setHasTriggeredGreeting] = useState(false)
  const [playingAudioId, setPlayingAudioId] = useState(null) // 當前播放語音的訊息 ID
  const [showAudioPermissionTip, setShowAudioPermissionTip] = useState(false) // 顯示音頻權限提示
  const [errorMessageIds, setErrorMessageIds] = useState(new Set()) // 記錄有錯誤的消息 ID
  const [showLoginRequired, setShowLoginRequired] = useState(false) // 顯示登錄提示
  const [isVoiceMode, setIsVoiceMode] = useState(false) // 語音/文字切換模式
  const [isRecording, setIsRecording] = useState(false) // 是否正在錄音
  const [cancelRecording, setCancelRecording] = useState(false) // 是否取消錄音
  const [recordingStartY, setRecordingStartY] = useState(0) // 錄音開始時的 Y 座標
  const [isSpeechSupported, setIsSpeechSupported] = useState(true) // 是否支持語音識別
  const [micPermissionGranted, setMicPermissionGranted] = useState(false) // 麥克風權限是否已授予
  const [isSettingsOpen, setIsSettingsOpen] = useState(false) // 設置彈窗開關
  const [voiceDurations, setVoiceDurations] = useState({}) // 存儲每個訊息的語音時長（秒）
  const [completedStreamingIds, setCompletedStreamingIds] = useState(new Set()) // 記錄已完成流式輸出的消息 ID
  const [typewriterCompletedIds, setTypewriterCompletedIds] = useState(new Set()) // 記錄已完成打字機效果的消息 ID
  const audioRefs = useRef({}) // 存儲每個訊息的音頻對象
  const userInteractedRef = useRef(false) // 記錄用戶是否已交互
  const recognitionRef = useRef(null) // Web Speech API 識別對象
  const touchStartYRef = useRef(0) // 觸摸開始時的 Y 座標

  // 設置持久化：從 localStorage 讀取
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_auto_play_enabled')
      return saved !== null ? saved === 'true' : true // 默認開啟
    } catch {
      return true
    }
  })

  // 保存自動播放設置到 localStorage
  const handleAutoPlayToggle = useCallback((enabled) => {
    setIsAutoPlayEnabled(enabled)
    try {
      localStorage.setItem('chat_auto_play_enabled', String(enabled))
    } catch (error) {
      console.error('[ChatPage] 保存自動播放設置失敗:', error)
    }
  }, [])

  // 保存 BGM 設置到 localStorage 並同步狀態
  const handleBGMToggle = useCallback(() => {
    try {
      const newMuted = !isMuted
      
      // 【邏輯解耦】僅調用 VoiceService.setBgmState 管理 BGM，不影響語音播放
      setBgmState(!newMuted) // newMuted 為 true 時關閉 BGM，false 時開啟
      
      // 同步更新本地狀態（用於 UI 顯示）
      toggleMute()
      
      // 保存新狀態到 localStorage
      localStorage.setItem('chat_bgm_enabled', String(!newMuted))
    } catch (error) {
      console.error('[ChatPage] 保存 BGM 設置失敗:', error)
    }
  }, [isMuted, toggleMute])

  // BGM 設置持久化：從 localStorage 讀取並同步狀態（僅在組件掛載時執行一次）
  useEffect(() => {
    try {
      const savedBGM = localStorage.getItem('chat_bgm_enabled')
      if (savedBGM !== null) {
        const bgmEnabled = savedBGM === 'true'
        // 如果設置為關閉且當前未靜音，則靜音
        if (!bgmEnabled && !isMuted) {
          // 使用 setTimeout 避免在渲染期間調用狀態更新
          setTimeout(() => {
            toggleMute()
          }, 100)
        }
        // 如果設置為開啟且當前靜音，則取消靜音
        if (bgmEnabled && isMuted) {
          setTimeout(() => {
            toggleMute()
          }, 100)
        }
      } else {
        // 如果沒有保存的設置，默認開啟，保存當前狀態
        localStorage.setItem('chat_bgm_enabled', String(!isMuted))
      }
    } catch (error) {
      console.error('[ChatPage] 讀取 BGM 設置失敗:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在組件掛載時執行一次
  
  // 階段名稱映射函數
  const mapStageName = useMemo(() => {
    const stage = String(rawStageName || '').toLowerCase().trim()
    
    if (stage === 'stage_1' || stage === 'initial') {
      return i18n.language === 'zh-CN' ? '初遇 · Encounter' : 'Encounter · 初遇'
    }
    if (stage === 'stage_2') {
      return i18n.language === 'zh-CN' ? '知心 · Resonance' : 'Resonance · 知心'
    }
    if (stage === 'stage_3') {
      return i18n.language === 'zh-CN' ? '入梦 · Deep Sleep' : 'Deep Sleep · 入梦'
    }
    
    // 默認返回原始值或翻譯
    return rawStageName || (i18n.language === 'zh-CN' ? '初遇 · Encounter' : 'Encounter · 初遇')
  }, [rawStageName, i18n.language])
  
  // 計算映射後的階段名稱和進度
  const stageName = mapStageName
  const stageProgress = useMemo(() => getStageProgress(rawStageName), [rawStageName])

  const abortRef = useRef(null)
  const listRef = useRef(null)
  const lastStreamingIdRef = useRef(null) // 記錄最後一個流式輸出的消息 ID
  const autoPlayTimeoutRef = useRef(null) // 防抖：記錄自動播放的 timeout
  const autoPlayedIdsRef = useRef(new Set()) // 【狀態鎖定】記錄已經自動播放過的消息 ID，防止重複觸發
  const sendMessageRef = useRef(null) // 存儲最新的 sendMessage 函數

  const canSend = useMemo(() => input.trim().length > 0 && !isStreaming, [input, isStreaming])

  const sendMessage = useCallback(async (queryText) => {
    // 確保 queryText 是非空字符串
    const trimmedQuery = typeof queryText === 'string' ? queryText.trim() : ''
    if (!trimmedQuery || isStreaming) {
      return
    }

    setIsStreaming(true)

    const assistantId = uid()
    const assistantMsg = { id: assistantId, role: 'assistant', content: '' }
    lastStreamingIdRef.current = assistantId

    setMessages((prev) => [...prev, assistantMsg])
    scrollToBottom()

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChat({
        query: trimmedQuery, // 確保是非空字符串
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
          )
          scrollToBottom()
        },
        onMeta: (meta) => {
          // 從 Dify 響應中提取 stage_name
          if (meta?.conversation_metadata?.stage_name) {
            setRawStageName(meta.conversation_metadata.stage_name)
          } else if (meta?.stage_name) {
            setRawStageName(meta.stage_name)
          }
        },
        onLoginRequired: () => {
          // 登錄攔截：顯示登錄提示
          console.log('[ChatPage] 觸發登錄提示')
          setShowLoginRequired(true)
          // 移除當前正在流式輸出的消息（因為包含 LOGIN_REQUIRED）
          setMessages((prev) => prev.filter((m) => m.id !== assistantId))
        },
        signal: controller.signal,
      })

      // 流式輸出完成，標記為已完成
      setCompletedStreamingIds((prev) => {
        const newSet = new Set(prev)
        newSet.add(assistantId)
        return newSet
      })

      // 注意：語音播放將在打字機效果完成後觸發（通過 Typewriter 的 onComplete 回調）
    } catch (error) {
      console.error('对话流式输出出错:', error)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `${m.content}\n\n[Error] ${error?.message || String(error)}` }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
      abortRef.current = null
      scrollToBottom()
    }
  }, [isMuted, isStreaming])

  // 更新 sendMessageRef
  useEffect(() => {
    sendMessageRef.current = sendMessage
  }, [sendMessage])

  // 監聽全局登錄要求事件（備用方案）
  useEffect(() => {
    const handleLoginRequired = () => {
      console.log('[ChatPage] 收到全局登錄要求事件')
      setShowLoginRequired(true)
    }

    window.addEventListener('dify:login-required', handleLoginRequired)

    return () => {
      window.removeEventListener('dify:login-required', handleLoginRequired)
    }
  }, [])

  // 暴露方法給父組件
  useImperativeHandle(ref, () => ({
    triggerAutoGreeting: () => {
      if (!hasTriggeredGreeting) {
        setHasTriggeredGreeting(true)
        // 使用合法的開場語文本（根據語言設置）
        const greetingText = i18n.language === 'zh-CN' ? '你好' : 'Hello'
        sendMessage(greetingText)
      }
    },
  }))

  // 進入聊天頁 0.5 秒後自動觸發開場語
  useEffect(() => {
    if (!hasTriggeredGreeting && onAutoGreeting) {
      const timer = setTimeout(() => {
        setHasTriggeredGreeting(true)
        // 使用合法的開場語文本（根據語言設置）
        const greetingText = i18n.language === 'zh-CN' ? '你好' : 'Hello'
        sendMessage(greetingText)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [hasTriggeredGreeting, onAutoGreeting, i18n.language])

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  const onSend = async () => {
    const q = input.trim()
    if (!q || isStreaming) return

    setInput('')
    const userMsg = { id: uid(), role: 'user', content: q }
    setMessages((prev) => [...prev, userMsg])
    scrollToBottom()

    // 用戶發送消息時，增加對話輪數
    incrementTurns()

    await sendMessage(q)
  }

  // 回車鍵發送邏輯
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  // 錄音權限預熱：組件加載時申請麥克風權限
  useEffect(() => {
    const requestMicPermission = async () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
          setMicPermissionGranted(true)
          console.log('[ChatPage] 麥克風權限已授予')
        } catch (error) {
          console.warn('[ChatPage] 麥克風權限申請失敗（用戶可能拒絕）:', error.name)
          setMicPermissionGranted(false)
        }
      }
    }

    requestMicPermission()
  }, [])

  // 初始化 Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        // 只有在沒有取消錄音時才發送
        if (transcript && !cancelRecording && !recognitionRef.current?.isCancelled) {
          setInput(transcript)
          // 自動發送
          setTimeout(() => {
            const userMsg = { id: uid(), role: 'user', content: transcript }
            setMessages((prev) => [...prev, userMsg])
            scrollToBottom()
            // 用戶發送消息時，增加對話輪數
            incrementTurns()
            if (sendMessageRef.current) {
              sendMessageRef.current(transcript)
            }
          }, 100)
        }
      }

      recognition.onerror = (event) => {
        console.error('[ChatPage] 語音識別錯誤:', event.error)
        setIsRecording(false)
        setCancelRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
        setCancelRecording(false)
      }

      recognitionRef.current = recognition
      setIsSpeechSupported(true)
    } else {
      // 瀏覽器不支持語音識別
      setIsSpeechSupported(false)
      console.warn('[ChatPage] 當前瀏覽器不支持語音識別，請使用 Chrome 或 Safari')
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [i18n.language])

  // 開始錄音
  const handleTouchStart = (e) => {
    if (!isVoiceMode) return
    
    // 強制攔截：第一行必須阻止默認行為
    e.preventDefault()
    e.stopPropagation()

    // 檢查瀏覽器支持
    if (!isSpeechSupported) {
      console.warn('[ChatPage] 當前瀏覽器不支持語音識別')
      return
    }

    const touch = e.touches?.[0] || { clientY: e.clientY }
    const startY = touch.clientY
    touchStartYRef.current = startY
    setRecordingStartY(startY)
    setIsRecording(true)
    setCancelRecording(false)

    // 開始語音識別
    if (recognitionRef.current) {
      try {
        recognitionRef.current.isCancelled = false
        recognitionRef.current.start()
      } catch (error) {
        console.error('[ChatPage] 語音識別啟動失敗:', error)
        setIsRecording(false)
      }
    }
  }

  // 移動時檢測是否取消
  const handleTouchMove = (e) => {
    if (!isRecording) return
    e.preventDefault()
    e.stopPropagation()

    const touch = e.touches?.[0] || { clientY: e.clientY }
    const currentY = touch.clientY
    const deltaY = touchStartYRef.current - currentY

    // 如果上滑超過 80px，則取消錄音
    if (deltaY > 80) {
      setCancelRecording(true)
    } else {
      setCancelRecording(false)
    }
  }

  // 結束錄音
  const handleTouchEnd = (e) => {
    if (!isRecording) return
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const shouldCancel = cancelRecording

    if (shouldCancel) {
      // 取消錄音：標記為已取消，停止識別
      if (recognitionRef.current) {
        recognitionRef.current.isCancelled = true
        recognitionRef.current.stop()
      }
      setIsRecording(false)
      setCancelRecording(false)
      // 清除取消標記，為下次錄音做準備
      setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.isCancelled = false
        }
      }, 100)
    } else {
      // 停止錄音並發送（語音識別結果會在 onresult 中處理）
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }

  // 觸摸取消事件：手指滑出屏幕或系統彈窗干擾時重置狀態
  const handleTouchCancel = (e) => {
    if (!isRecording) return
    e.preventDefault()
    e.stopPropagation()

    console.log('[ChatPage] 觸摸被取消，重置錄音狀態')
    
    if (recognitionRef.current) {
      recognitionRef.current.isCancelled = true
      recognitionRef.current.stop()
    }
    setIsRecording(false)
    setCancelRecording(false)
    
    // 清除取消標記
    setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.isCancelled = false
      }
    }, 100)
  }

  const toggleLang = () => {
    const next = i18n.language === 'zh-CN' ? 'en' : 'zh-CN'
    i18n.changeLanguage(next)
  }

  // 手動播放語音（用戶點擊圖標時觸發，不受請求鎖限制）
  const playVoice = async (messageId, content) => {
    console.log('[ChatPage] playVoice 被調用，messageId:', messageId, '內容長度:', content?.length || 0)
    
    if (!content || !content.trim()) {
      console.log('[ChatPage] 內容為空，跳過播放')
      return
    }

    // 使用全局音頻單例，不依賴 audioRefs
    const globalAudio = typeof window !== 'undefined' ? window.yubaiAudio : null
    if (!globalAudio) {
      console.error('[ChatPage] 全局音頻單例不存在')
      return
    }

    // 如果點擊的是當前播放的語音，則停止
    if (playingAudioId === messageId && !globalAudio.paused) {
      console.log('[ChatPage] 停止當前播放的語音')
      globalAudio.pause()
      globalAudio.currentTime = 0
      setPlayingAudioId(null)
      return
    }

    // 如果正在播放其他語音，先停止
    if (playingAudioId && playingAudioId !== messageId && !globalAudio.paused) {
      console.log('[ChatPage] 停止當前播放的語音:', playingAudioId)
      globalAudio.pause()
      globalAudio.currentTime = 0
    }

    try {
      // 直接使用 VoiceService.generateSpeech，驅動全局單例 window.yubaiAudio
      console.log('[ChatPage] 生成並播放語音...')
      const playPromise = await generateSpeech(content.trim())
      
      if (playPromise) {
        console.log('[ChatPage] 語音播放成功')
        setPlayingAudioId(messageId)
        userInteractedRef.current = true
        setShowAudioPermissionTip(false)
        
        // 監聽播放結束
        globalAudio.addEventListener('ended', () => {
          console.log('[ChatPage] 語音播放結束')
          setPlayingAudioId((prev) => (prev === messageId ? null : prev))
        }, { once: true })
        
        // 監聽播放錯誤
        globalAudio.addEventListener('error', (e) => {
          console.error('[ChatPage] 語音播放錯誤:', e)
          setPlayingAudioId((prev) => (prev === messageId ? null : prev))
          setErrorMessageIds((prev) => new Set([...prev, messageId]))
        }, { once: true })
      }
    } catch (error) {
      // 靜默錯誤處理：只記錄不彈窗，僅在控制台打印一次
      console.error('[ChatPage] 語音播放失敗:', error)
      setErrorMessageIds((prev) => new Set([...prev, messageId]))
      // 檢查是否為自動播放被攔截
      if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
        console.log('[ChatPage] 檢測到播放被攔截，顯示權限提示')
        setShowAudioPermissionTip(true)
      }
    }
  }

  // 清理音頻資源和 timeout
  useEffect(() => {
    return () => {
      // 清理自動播放 timeout
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current)
      }
      // 清理音頻資源
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause()
          audio.src = ''
        }
      })
    }
  }, [])

  return (
    <>
      {/* 層級一：頂部導航欄 (Navbar) */}
      <div className="fixed left-0 top-0 z-50 w-full pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-md items-center justify-end px-4 py-3">
          {/* 右側：設置圖標 */}
          <button
            className="flex h-8 w-8 items-center justify-center text-white transition-all hover:opacity-80 active:scale-95"
            onClick={() => setIsSettingsOpen(true)}
            type="button"
            aria-label="设置"
          >
            <Settings className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 層級二：頂部懸浮內容區 (Top Floating Content) - z-index: 50 確保在遮罩層之上 */}
      <div className="fixed left-0 top-0 z-50 w-full pt-[env(safe-area-inset-top)] mt-[36px]">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4">
          {/* 左側膠囊：角色信息 */}
          <div className="flex shrink-0 min-w-[140px] h-12 items-center gap-2 rounded-full bg-black/30 px-2 py-2 backdrop-blur-lg">
            {/* 頭像容器 */}
            <div className="relative shrink-0">
              <img
                src={avatarImg}
                alt="江予白"
                className="h-8 w-8 rounded-full object-cover"
              />
            </div>
            {/* 名字和副標題 */}
            <div className="flex flex-col">
              <div className="text-[12px] font-medium text-white">江予白</div>
              <div className="text-[9px] text-white/60">你的梦境守护者</div>
            </div>
            {/* 加號圖標（容器右端，垂直居中） */}
            <div className="ml-auto flex h-4 w-4 items-center justify-center">
              <CirclePlus className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
          </div>

          {/* 右側膠囊：親密度 */}
          <div className="flex shrink-0 min-w-[120px] h-12 items-center rounded-full bg-black/30 px-2 py-2 backdrop-blur-lg">
            {/* 左側：愛心圖標（帶等級數字） */}
            <div className="relative shrink-0">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* 漸變定義 */}
                  <linearGradient
                    id="heart-fill-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="rotate(220.73 12 12)"
                  >
                    <stop offset="13.67%" stopColor="#FF5456" />
                    <stop offset="83.77%" stopColor="#FF54A7" />
                  </linearGradient>
                  {/* 內陰影濾鏡（高保真還原 inset -1px 3px 4px rgba(255, 255, 255, 0.5)） */}
                  <filter id="heart-inner-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    {/* 步驟1: 創建偏移的陰影（dx=-1, dy=3） */}
                    <feOffset dx="-1" dy="3" in="SourceAlpha" result="offset" />
                    {/* 步驟2: 模糊陰影（stdDeviation=2 對應 4px blur） */}
                    <feGaussianBlur stdDeviation="2" in="offset" result="blur" />
                    {/* 步驟3: 使用 operator="out" 提取形狀外部區域（即內陰影區域） */}
                    <feComposite in="SourceAlpha" in2="blur" operator="out" result="inner-shadow-mask" />
                    {/* 步驟4: 創建白色半透明填充 */}
                    <feFlood floodColor="#FFFFFF" floodOpacity="0.5" result="flood" />
                    {/* 步驟5: 將填充與內陰影遮罩合成 */}
                    <feComposite in="flood" in2="inner-shadow-mask" operator="in" result="inner-shadow" />
                    {/* 步驟6: 將內陰影與原始圖形合成 */}
                    <feComposite in="SourceGraphic" in2="inner-shadow" operator="over" />
                  </filter>
                </defs>
                {/* 愛心路徑 */}
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="url(#heart-fill-gradient)"
                  filter="url(#heart-inner-shadow)"
                />
              </svg>
              {/* 愛心內部的等級數字 */}
              <div 
                className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white"
                style={{
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                }}
              >
                {getIntimacyLevel(chatTurns)}
              </div>
            </div>
            
            {/* 右側：雙行內容區 */}
            <div className="ml-2 flex flex-1 flex-col justify-center">
              {/* 第一行：Lv.X 和 (當前/目標) */}
              {(() => {
                const levelInfo = getIntimacyLevelInfo(chatTurns)
                const currentLevel = levelInfo.level
                const currentProgressText = `(${chatTurns}/${levelInfo.target})`
                return (
                  <>
                    <div className="flex items-baseline gap-1">
                      <div className="text-[12px] text-white">
                        Lv.{currentLevel}
                      </div>
                      <div className="text-[10px] text-white/60">
                        {currentProgressText}
                      </div>
                    </div>
                    {/* 第二行：進度條（高保真還原） */}
                    <div className="mt-0.5 h-[4px] w-[80%] overflow-hidden rounded-full bg-white/20">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: 'linear-gradient(247.41deg, #D969F8 14.69%, #FF8DC4 82.67%)',
                        }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${getIntimacyProgressPercent(chatTurns)}%` }}
                        transition={{
                          duration: 0.8,
                          ease: 'easeOut',
                        }}
                      />
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* 音頻權限提示 */}
      {showAudioPermissionTip && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/90 px-6 py-4 shadow-lg backdrop-blur-md"
        >
          <p className="text-center text-sm text-slate-900">
            點擊此處激活江予白的聲音
          </p>
          <button
            onClick={() => {
              setShowAudioPermissionTip(false)
              userInteractedRef.current = true
            }}
            className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 active:scale-95"
            type="button"
          >
            我知道了
          </button>
        </motion.div>
      )}

      {/* 登錄提示 */}
      {showLoginRequired && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-2xl bg-white/90 px-6 py-4 shadow-lg backdrop-blur-md"
        >
          <p className="text-center text-sm text-slate-900">
            {i18n.language === 'zh-CN' ? '請登錄後繼續' : 'Please login to continue'}
          </p>
          <button
            onClick={() => {
              setShowLoginRequired(false)
            }}
            className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 active:scale-95"
            type="button"
          >
            {i18n.language === 'zh-CN' ? '我知道了' : 'Got it'}
          </button>
        </motion.div>
      )}

      {/* 设置弹窗 */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            {/* 背景遮罩 - 使用 Flexbox 实现完美居中 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm"
              onClick={() => setIsSettingsOpen(false)}
            >
              {/* 设置弹窗 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative z-[71] w-full max-w-sm rounded-2xl px-6 py-5 shadow-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(12px)',
                }}
                onClick={(e) => e.stopPropagation()} // 阻止点击弹窗内部时关闭
              >
                {/* 标题栏 */}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {i18n.language === 'zh-CN' ? '设置' : 'Settings'}
                  </h2>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100 active:scale-95"
                    type="button"
                    aria-label="关闭"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* 设置项列表 */}
                <div className="space-y-4">
                  {/* BGM 开关 */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {i18n.language === 'zh-CN' ? '背景音乐' : 'Background Music'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {i18n.language === 'zh-CN' ? '控制背景音乐的播放与静音' : 'Control background music playback'}
                      </p>
                    </div>
                    <button
                      onClick={handleBGMToggle}
                      className={`relative h-7 w-12 rounded-full transition-colors ${
                        !isMuted ? 'bg-slate-900' : 'bg-slate-300'
                      }`}
                      type="button"
                      role="switch"
                      aria-checked={!isMuted}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                          !isMuted ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 语音自动播放开关 */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {i18n.language === 'zh-CN' ? '语音自动播放' : 'Auto Play Voice'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {i18n.language === 'zh-CN' ? 'AI 回复后自动触发语音生成' : 'Automatically play voice after AI response'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAutoPlayToggle(!isAutoPlayEnabled)}
                      className={`relative h-7 w-12 rounded-full transition-colors ${
                        isAutoPlayEnabled ? 'bg-slate-900' : 'bg-slate-300'
                      }`}
                      type="button"
                      role="switch"
                      aria-checked={isAutoPlayEnabled}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                          isAutoPlayEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 主內容區域 - 使用 Flexbox 布局，確保 iOS Safari 地址欄彈出時布局準確 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col h-dvh overflow-hidden"
        style={{
          backdropFilter: 'blur(3px)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)', // 輕薄玻璃質感，讓視頻背景更透亮
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-md flex-col relative">
          {/* 頂部漸變遮罩層 - 極致清爽 UI：從純黑色開始，在 20px 處迅速過渡到透明，確保文字像消失在深淵中一樣自然沒入 */}
          <div
            className="absolute top-0 left-0 right-0 z-40 pointer-events-none"
            style={{
              height: '160px',
              background: 'linear-gradient(to bottom, #0A0A0B 0%, #0A0A0B 12.5%, rgba(10, 10, 11, 0.8) 20%, rgba(10, 10, 11, 0.4) 40%, rgba(10, 10, 11, 0.1) 60%, transparent 100%)',
            }}
          />
          
          {/* Messages - 消息列表容器，使用 flex-1 佔據剩餘空間，overflow-y-auto 實現滾動，z-index: 10 確保在遮罩層之下 */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 pt-32 py-4 relative z-10"
            style={{
              backgroundColor: 'transparent',
            }}
          >
            <div className="flex flex-col space-y-6">
              {/* 角色介紹容器 - 作為消息列表的第一個元素，始終顯示在頂部 */}
              <div className="mt-[70px]">
                <IntroCard />
              </div>

              <AnimatePresence initial={false}>
                {messages.map((m, index) => {
                  // 判斷是否是第一條 assistant 消息
                  const isFirstAssistantMessage = m.role === 'assistant' && 
                    messages.findIndex(msg => msg.role === 'assistant') === index
                  
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`${m.role === 'user' ? 'mb-8 flex items-end gap-2' : 'mb-8 flex flex-col items-start'} ${isFirstAssistantMessage ? 'mt-[20px]' : ''}`}
                    >
                    {/* 消息氣泡容器（AI 需要 relative 定位以放置语音 Pill） */}
                    <div className={m.role === 'assistant' ? 'relative' : 'ml-auto'}>
                      {/* AI 消息：語音標識 pill 容器（極簡圓角樣式） */}
                      {m.role === 'assistant' && m.content && m.content.trim() && (() => {
                        const duration = voiceDurations[m.id] || estimateVoiceDuration(m.content)
                        const durationText = `${duration}''`
                        
                        return (
                          <button
                            onClick={() => playVoice(m.id, m.content)}
                            className="absolute left-0 -top-[12px] z-10 flex items-center gap-1.5 rounded-full bg-[#211E2C]/90 backdrop-blur-md px-2 py-1 transition-all hover:opacity-80 active:scale-95"
                            style={{
                              boxShadow: 'inset 0px -8px 10px rgba(140, 72, 135, 0.25)',
                            }}
                            type="button"
                            aria-label="播放語音"
                          >
                            {playingAudioId === m.id ? (
                              <motion.div
                                className="flex items-center gap-0.5"
                                initial="rest"
                                animate="animate"
                                variants={{
                                  rest: {},
                                  animate: {
                                    transition: {
                                      staggerChildren: 0.1,
                                      repeat: Infinity,
                                    },
                                  },
                                }}
                              >
                                {[0, 1, 2].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="h-2 w-0.5 bg-white rounded-full"
                                    variants={{
                                      rest: { height: 4 },
                                      animate: {
                                        height: [4, 10, 4],
                                        transition: {
                                          duration: 0.4,
                                          repeat: Infinity,
                                        },
                                      },
                                    }}
                                  />
                                ))}
                              </motion.div>
                            ) : errorMessageIds.has(m.id) ? (
                              <>
                                <Play className="h-3 w-3 text-white/60 shrink-0" strokeWidth={2} fill="white/60" />
                                <span className="text-[10px] text-white/60 whitespace-nowrap">{durationText}</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 text-white shrink-0" strokeWidth={2} fill="white" />
                                <span className="text-[10px] text-white whitespace-nowrap">{durationText}</span>
                              </>
                            )}
                          </button>
                        )
                      })()}

                      {/* 消息氣泡 */}
                      <div
                        className={
                          m.role === 'user'
                            ? `max-w-[318px] p-4 text-left text-sm ${
                                isSingleLine(m.content) ? 'rounded-full' : 'rounded-[16px]'
                              }`
                            : `relative max-w-[318px] p-4 text-left text-sm text-white ${
                                isSingleLine(m.content) ? 'rounded-full' : 'rounded-[16px]'
                              }`
                        }
                        style={{
                          whiteSpace: 'pre-wrap',
                          ...(m.role === 'user'
                            ? {
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                color: '#1A1A1A',
                              }
                            : {
                                backgroundColor: '#211E2C',
                                opacity: 0.9,
                                backdropFilter: 'blur(12px)',
                                boxShadow: 'inset 0px -8px 10px rgba(140, 72, 135, 0.25)',
                              }),
                        }}
                      >
                        {m.role === 'user' ? (
                          // 用戶消息：直接顯示
                          m.content ? renderTextWithBrackets(m.content, true) : ''
                        ) : m.role === 'assistant' && isStreaming && m.id === lastStreamingIdRef.current ? (
                          // AI 消息：正在流式輸出時顯示省略號
                          '…'
                        ) : m.role === 'assistant' && m.content && completedStreamingIds.has(m.id) && !typewriterCompletedIds.has(m.id) ? (
                          // AI 消息：流式輸出完成後，使用打字機效果
                          <Typewriter
                            text={m.content}
                            isUser={false}
                            onProgress={() => {
                              // 實時滾動到底部
                              scrollToBottom()
                            }}
                            onComplete={() => {
                              // 打字機效果完成後，標記為已完成
                              setTypewriterCompletedIds((prev) => {
                                const newSet = new Set(prev)
                                newSet.add(m.id)
                                return newSet
                              })
                              
                              // 【唯一自動播放入口】如果當前消息是 assistant 角色，立即調用 playVoice
                              if (m.role === 'assistant') {
                                const messageId = m.id
                                
                                // 【狀態鎖定】檢查該消息是否已經自動播放過，防止重複觸發
                                if (autoPlayedIdsRef.current.has(messageId)) {
                                  console.log('[ChatPage] 消息已自動播放過，跳過重複觸發:', messageId)
                                  return
                                }
                                
                                // 【邏輯解耦】isMuted 僅控制 BGM，不影響語音自動播放
                                // 已刪除對 isMuted 的檢查，確保關閉 BGM 後語音依然自動播放
                                
                                // 檢查自動播放開關
                                if (!isAutoPlayEnabled) {
                                  return
                                }
                                
                                // 標記為已自動播放，防止重複觸發
                                autoPlayedIdsRef.current.add(messageId)
                                
                                // 直接調用 playVoice，使用全局單例 window.yubaiAudio
                                console.log('[ChatPage] 打字機效果完成，自動播放語音...', messageId)
                                playVoice(messageId, m.content)
                              }
                            }}
                          />
                        ) : m.role === 'assistant' && m.content ? (
                          // AI 消息：已完成打字機效果或歷史消息，直接顯示完整內容
                          renderTextWithBrackets(m.content, false)
                        ) : (
                          // 空內容
                          ''
                        )}
                      </div>
                    </div>
                  </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

        {/* Input - 底部輸入框容器，使用 shrink-0 防止被壓縮 */}
        <div
          className="shrink-0 z-50 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-xl"
          style={{
            paddingTop: '1rem',
            paddingBottom: `calc(1rem + env(safe-area-inset-bottom))`, // 適配手機安全區域
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          {/* 內容容器 - 與主內容區域對齊 */}
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center gap-3">
              {/* 左側：切換圖標 */}
              <button
                type="button"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-white transition-all hover:opacity-70 active:scale-95"
                aria-label={isVoiceMode ? '切換到文字輸入' : '切換到語音輸入'}
              >
                {isVoiceMode ? (
                  <Keyboard className="h-6 w-6" strokeWidth={1.5} />
                ) : (
                  <Mic className="h-6 w-6" strokeWidth={1.5} />
                )}
              </button>

              {/* 中間：輸入組件 */}
              {isVoiceMode ? (
                // 語音模式：按住說話按鈕
                <button
                  type="button"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                  onMouseDown={handleTouchStart}
                  onMouseMove={handleTouchMove}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  className={`flex-1 h-10 rounded-full px-6 text-sm font-medium text-white text-center transition-transform active:scale-95 border border-white/5 ${
                    cancelRecording
                      ? 'bg-red-500/80'
                      : isRecording
                      ? 'bg-white/20'
                      : 'bg-white/20'
                  }`}
                  style={{
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                  disabled={!isSpeechSupported}
                >
                  {isRecording ? (
                    <div className="flex items-center justify-center gap-2">
                      <motion.div
                        className="flex items-center gap-1"
                        initial="rest"
                        animate="animate"
                        variants={{
                          rest: {},
                          animate: {
                            transition: {
                              staggerChildren: 0.1,
                              repeat: Infinity,
                            },
                          },
                        }}
                      >
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            className="h-4 w-1 bg-white rounded-full"
                            variants={{
                              rest: { height: 8 },
                              animate: {
                                height: [8, 20, 8],
                                transition: {
                                  duration: 0.5,
                                  repeat: Infinity,
                                },
                              },
                            }}
                          />
                        ))}
                      </motion.div>
                      <span>{cancelRecording ? '鬆開手指，取消發送' : '手指上滑，取消發送'}</span>
                    </div>
                  ) : (
                    <span className="text-center">
                      {!isSpeechSupported 
                        ? '當前瀏覽器不支持錄音，請使用 Chrome 或 Safari' 
                        : '按住 說話'}
                    </span>
                  )}
                </button>
              ) : (
                // 文字模式：輸入框 - 使用 flex items-center 包裝確保文字垂直居中
                <div className="flex-1 flex items-center">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="发消息给江予白..."
                    rows={1}
                    className="w-full h-10 max-h-32 resize-none rounded-full bg-white/10 border border-white/5 px-4 py-0 text-sm leading-[40px] text-white placeholder:text-white/30 placeholder:leading-[40px] outline-none focus:border-white/10 transition-all"
                    style={{
                      lineHeight: '40px', // 嚴格垂直居中：高度 40px，行高 40px
                    }}
                  />
                </div>
              )}

              {/* 右側：發送圖標 */}
              {!isVoiceMode && (
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={onSend}
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-white transition-all hover:opacity-70 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="發送"
                  style={{
                    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
                  }}
                >
                  <Send className="h-6 w-6" strokeWidth={1.5} fill="currentColor" />
                </button>
              )}
            </div>

            {/* 瀏覽器不支持提示 */}
            {isVoiceMode && !isSpeechSupported && (
              <p className="mt-2 text-center text-xs text-white/60">
                請使用 Chrome 或 Safari 瀏覽器以使用語音輸入功能
              </p>
            )}
          </div>
        </div>

        {/* 錄音遮罩 */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
          >
            <div className="flex flex-col items-center gap-4">
              {/* 語音波紋動畫 */}
              <motion.div
                className="flex items-center justify-center gap-2"
                initial="rest"
                animate="animate"
                variants={{
                  rest: {},
                  animate: {
                    transition: {
                      staggerChildren: 0.1,
                      repeat: Infinity,
                    },
                  },
                }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className={`h-2 w-2 rounded-full ${
                      cancelRecording ? 'bg-red-400' : 'bg-white'
                    }`}
                    variants={{
                      rest: { scale: 1, opacity: 0.5 },
                      animate: {
                        scale: [1, 2, 1],
                        opacity: [0.5, 1, 0.5],
                        transition: {
                          duration: 0.8,
                          repeat: Infinity,
                        },
                      },
                    }}
                  />
                ))}
              </motion.div>

              {/* 提示文字 */}
              <p
                className={`text-lg font-medium ${
                  cancelRecording ? 'text-red-400' : 'text-white'
                }`}
                style={{
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                {cancelRecording ? '鬆開手指，取消發送' : '手指上滑，取消發送'}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
    </>
  )
})

export default ChatPage
