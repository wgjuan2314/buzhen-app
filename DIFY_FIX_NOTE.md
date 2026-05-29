# Dify 对话空回复修复说明

## 现象

前端可以成功请求 Dify，HTTP 状态为 200，但聊天页只出现空的 AI 头像，没有文字回复。

本地用 blocking 模式测试 Dify 时，接口返回：

```text
Run failed: <fd3>:5: DeprecationWarning: datetime.datetime.utcfromtimestamp() is deprecated
```

## 根因

Dify 工作流中的 Python 代码节点使用了：

```python
datetime.utcfromtimestamp(time.time() + 28800)
```

新运行环境会把这个弃用警告当成工作流失败，导致最终 `outputs` 为空，前端无内容可显示。

## Dify 后台修改

在 Dify 工作流里找到生成 `time_context` 的代码节点，把：

```python
from datetime import datetime
import time

beijing_now = datetime.utcfromtimestamp(time.time() + 28800)
```

改成：

```python
from datetime import datetime, timezone, timedelta

beijing_now = datetime.now(timezone.utc) + timedelta(hours=8)
```

或者更直接：

```python
from datetime import datetime, timezone, timedelta

beijing_now = datetime.now(timezone(timedelta(hours=8)))
```

保存并发布工作流后，再回到本地项目测试聊天。

## 前端保护

`src/services/DifyService.js` 已补强：如果 Dify 工作流返回空输出或失败事件，聊天气泡会显示明确错误，不再只显示空头像。
