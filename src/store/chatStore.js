import { create } from 'zustand'

const STORAGE_KEY = 'buzhen_total_turns'

function loadTurnsFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      const num = parseInt(saved, 10)
      return Number.isNaN(num) ? 0 : Math.max(0, num)
    }
  } catch (_e) {}
  return 0
}

// 聊天全局状态管理（亲密度持久化）
export const useChatStore = create((set) => ({
  chatTurns: loadTurnsFromStorage(), // 优先从 localStorage 读取

  // 增加对话轮数，并同步写入 localStorage
  incrementTurns: () =>
    set((state) => {
      const newValue = state.chatTurns + 1
      try {
        localStorage.setItem(STORAGE_KEY, String(newValue))
      } catch (_e) {}
      return { chatTurns: newValue }
    }),

  // 设置对话轮数，并同步写入 localStorage
  setChatTurns: (turns) => {
    const value = Math.max(0, turns)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch (_e) {}
    return set({ chatTurns: value })
  },

  // 重置对话轮数
  resetTurns: () => {
    try {
      localStorage.setItem(STORAGE_KEY, '0')
    } catch (_e) {}
    return set({ chatTurns: 0 })
  },
}))
