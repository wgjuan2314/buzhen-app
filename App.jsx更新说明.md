# App.jsx 更新说明

## ✅ 已完成的修正

### 1. 更新导入
- ✅ 已删除 `import LandingPage from './components/LandingPage'`
- ✅ 已添加 `import SomniumLanding from './components/SomniumLanding'`
- ✅ 已删除所有对 `StartPage` 的引用（未找到）

### 2. 绑定路由
- ✅ 已将 `<LandingPage key="landing" ... />` 替换为 `<SomniumLanding key="landing" />`
- ✅ 已移除传递给 LandingPage 的 props（`onEnterDream` 和 `onUnlockAudio`）
- ✅ SomniumLanding 使用内部逻辑处理跳转和音频播放

### 3. Hash 路由同步
- ✅ 已添加 `useEffect` 监听 `hashchange` 事件
- ✅ 当 `window.location.hash === '#/chat'` 或 `'/chat'` 时，设置 `showChat = true`
- ✅ 当 hash 为空或 `#/` 时，设置 `showChat = false`
- ✅ 确保 SomniumLanding 的 hash 跳转与 App.jsx 的状态同步

### 4. 检查报错
- ✅ 已检查所有文件，没有残留的 `StartPage` 或 `LandingPage` 引用
- ✅ Linter 检查通过，无错误

## 📝 变更详情

### 导入变更
```javascript
// 之前
import LandingPage from './components/LandingPage'

// 现在
import SomniumLanding from './components/SomniumLanding'
```

### 组件使用变更
```javascript
// 之前
<LandingPage key="landing" onEnterDream={handleEnterDream} onUnlockAudio={startBGM} />

// 现在
<SomniumLanding key="landing" />
```

### 新增 Hash 路由监听
```javascript
useEffect(() => {
  const handleHashChange = () => {
    if (window.location.hash === '#/chat' || window.location.hash === '/chat') {
      setShowChat(true)
    } else if (window.location.hash === '' || window.location.hash === '#/' || !window.location.hash) {
      setShowChat(false)
    }
  }
  
  handleHashChange()
  window.addEventListener('hashchange', handleHashChange)
  
  return () => {
    window.removeEventListener('hashchange', handleHashChange)
  }
}, [])
```

## 🔍 路由逻辑说明

### SomniumLanding 的跳转方式
- SomniumLanding 使用 `window.location.hash = '/chat'` 进行跳转
- App.jsx 通过监听 `hashchange` 事件同步状态
- 当 hash 变为 `#/chat` 时，显示 ChatPage
- 当 hash 为空时，显示 SomniumLanding

### 状态同步
- `showChat` 状态与 `window.location.hash` 保持同步
- 支持浏览器前进/后退按钮
- 支持直接访问 `#/chat` URL

## ✅ 验证清单

- ✅ 导入已更新为 SomniumLanding
- ✅ 组件使用已替换
- ✅ Hash 路由监听已添加
- ✅ 无残留的 StartPage/LandingPage 引用
- ✅ Linter 检查通过
- ✅ 逻辑连接正常

**所有修正已完成！**
