import { create } from 'zustand'

// 聊天全局状态管理
export const useChatStore = create((set) => ({
  chatTurns: 0, // 当前对话轮数
  
  // 增加对话轮数
  incrementTurns: () => set((state) => ({ chatTurns: state.chatTurns + 1 })),
  
  // 设置对话轮数
  setChatTurns: (turns) => set({ chatTurns: turns }),
  
  // 重置对话轮数
  resetTurns: () => set({ chatTurns: 0 }),
}))
