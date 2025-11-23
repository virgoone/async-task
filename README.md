# useAsyncTask

一个强大的 React Hook，用于管理复杂的异步任务状态。提供类似 SWR 或 React Query 的能力，但更轻量且专注于特定需求。

## ✨ 特性

- 🔄 **完整的状态管理** - loading、error、data、retryCount、lastUpdated
- 🚀 **自动执行** - 支持组件挂载或依赖变化时自动执行
- ♻️ **重试机制** - 失败时自动重试，可配置最大重试次数
- 💾 **缓存支持** - 基于 taskKey 的智能缓存，避免重复请求
- ⚡ **竞态控制** - 自动处理并发请求，只保留最新请求的结果
- 🔁 **轮询功能** - 支持定时轮询，自动刷新数据
- 🌍 **跨组件状态共享** - 相同 taskKey 的组件共享状态
- 📦 **类型安全** - 完整的 TypeScript 类型支持
- 🪶 **轻量级** - 无外部依赖，包体积小

## 📦 安装

```bash
# 使用 pnpm
pnpm add use-async-task

# 使用 npm
npm install use-async-task

# 使用 yarn
yarn add use-async-task
```

## 🚀 快速开始

### 基础用法

```tsx
import { useAsyncTask } from 'use-async-task'

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error, execute } = useAsyncTask(
    async (id: string) => {
      const response = await fetch(`/api/users/${id}`)
      return response.json()
    }
  )

  return (
    <div>
      <button onClick={() => execute(userId)}>加载用户</button>
      {loading && <p>加载中...</p>}
      {error && <p>错误: {error.message}</p>}
      {data && <div>{data.name}</div>}
    </div>
  )
}
```

### 依赖变化自动执行

```tsx
function TodoList() {
  const [page, setPage] = useState(1)

  const { data, loading, execute } = useAsyncTask(
    async (p: number) => {
      const response = await fetch(`/api/todos?page=${p}`)
      return response.json()
    }
  )

  // 使用 useEffect 控制执行时机
  useEffect(() => {
    execute(page)
  }, [page])

  return (
    <div>
      {loading ? <p>加载中...</p> : (
        <ul>
          {data?.items.map(item => <li key={item.id}>{item.title}</li>)}
        </ul>
      )}
      <button onClick={() => setPage(p => p + 1)}>下一页</button>
    </div>
  )
}
```

### 搜索与缓存

```tsx
function Search() {
  const [query, setQuery] = useState('')

  const { data, loading, execute } = useAsyncTask(
    async (q: string) => {
      const response = await fetch(`/api/search?q=${q}`)
      return response.json()
    },
    {
      cacheTime: 30000,                    // 30秒缓存
      taskKey: (q) => `search-${q}`,       // 动态缓存键
    }
  )

  // query 变化时执行搜索
  useEffect(() => {
    if (query) {
      execute(query)
    }
  }, [query])

  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        placeholder="搜索..."
      />
      {loading && <p>搜索中...</p>}
      {data && <ResultList items={data} />}
    </div>
  )
}
```

### 轮询

```tsx
function RealtimeStats() {
  const { data, loading } = useAsyncTask(
    async () => {
      const response = await fetch('/api/stats')
      return response.json()
    },
    {
      immediate: true,
      pollingInterval: 5000,  // 每 5 秒轮询一次
    }
  )

  return (
    <div>
      <h2>实时统计</h2>
      {data && <p>当前用户数: {data.userCount}</p>}
      {loading && <span>刷新中...</span>}
    </div>
  )
}
```

### 重试机制

```tsx
function DataFetcher() {
  const { data, error, retryCount, execute } = useAsyncTask(
    async () => {
      const response = await fetch('/api/data')
      if (!response.ok) throw new Error('请求失败')
      return response.json()
    },
    {
      maxRetries: 3,  // 失败时最多重试 3 次
    }
  )

  return (
    <div>
      <button onClick={() => execute()}>加载数据</button>
      {error && (
        <p>错误: {error.message} (已重试 {retryCount} 次)</p>
      )}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  )
}
```

### 跨组件状态共享

```tsx
// 组件 A
function ComponentA() {
  const { data, loading, execute } = useAsyncTask(
    async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`)
      return response.json()
    },
    {
      taskKey: (id) => `user-${id}`,  // 相同的 taskKey
    }
  )

  return <button onClick={() => execute('123')}>加载用户</button>
}

// 组件 B - 自动同步状态
function ComponentB() {
  const { data, loading } = useAsyncTask(
    async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`)
      return response.json()
    },
    {
      taskKey: (id) => `user-${id}`,  // 相同的 taskKey
    }
  )

  // 当组件 A 执行时，组件 B 的状态也会同步更新
  return loading ? <p>加载中...</p> : <p>{data?.name}</p>
}
```

## 📖 API 参考

### useAsyncTask

```typescript
function useAsyncTask<Args extends any[], T, TError = unknown>(
  action: (...args: Args) => Promise<T>,
  options?: UseAsyncTaskOptions<T, Args>
): UseAsyncTaskResult<Args, T, TError>
```

#### 参数

**action**

要执行的异步函数。

```typescript
(...args: Args) => Promise<T>
```

**options** (可选)

配置选项对象：

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `immediate` | `boolean` | `false` | 组件挂载或依赖变化时是否自动执行 |
| `dependencies` | `DependencyList` | `[]` | 依赖数组，类似 useEffect |
| `pollingInterval` | `number` | `0` | 轮询间隔（毫秒），0 表示不轮询 |
| `maxRetries` | `number` | `0` | 最大重试次数 |
| `cacheTime` | `number` | `0` | 缓存有效期（毫秒），0 表示不缓存 |
| `taskKey` | `string \| ((...args: Args) => string)` | `undefined` | 任务键，用于缓存和跨组件状态共享 |

#### 返回值

返回一个包含以下属性的对象：

| 属性 | 类型 | 描述 |
|------|------|------|
| `data` | `T \| null` | 任务返回的数据 |
| `loading` | `boolean` | 是否正在执行 |
| `error` | `TError \| null` | 执行过程中的错误 |
| `retryCount` | `number` | 当前重试次数 |
| `lastUpdated` | `number \| null` | 最后更新时间戳（毫秒） |
| `execute` | `(...args: Args) => Promise<T \| void>` | 手动执行任务的函数 |
| `cancel` | `() => void` | 取消当前任务（停止接收结果） |
| `reset` | `() => void` | 重置状态为初始值并清除缓存 |

## 💡 使用场景

### 1. 列表加载与翻页

适用于需要根据页码或筛选条件加载数据的场景。

```tsx
const [filters, setFilters] = useState({ page: 1, category: 'all' })

const { data, loading } = useAsyncTask(
  async ({ page, category }) => fetchList(page, category),
  {
    immediate: true,
    dependencies: [filters.page, filters.category],
  }
)
```

### 2. 搜索与自动完成

快速输入时自动处理竞态条件，结合缓存避免重复请求。

```tsx
const [query, setQuery] = useState('')

const { data } = useAsyncTask(
  async (q: string) => searchAPI(q),
  {
    immediate: true,
    dependencies: [query],
    cacheTime: 60000,                  // 1分钟缓存
    taskKey: (q) => `search-${q}`,     // 支持回退时使用缓存
  }
)
```

### 3. 实时数据轮询

定期刷新数据，如仪表盘、统计数据等。

```tsx
const { data } = useAsyncTask(
  async () => fetchDashboardStats(),
  {
    immediate: true,
    pollingInterval: 10000,  // 每 10 秒刷新
  }
)
```

### 4. 带重试的关键请求

对于重要的请求，失败时自动重试。

```tsx
const { data, error, retryCount } = useAsyncTask(
  async () => submitPayment(paymentData),
  {
    maxRetries: 3,
  }
)
```

### 5. 跨组件数据共享

多个组件需要显示同一份数据时，避免重复请求。

```tsx
// 所有使用相同 taskKey 的组件会共享状态
const { data, loading } = useAsyncTask(
  async (id: string) => fetchUserProfile(id),
  {
    taskKey: (id) => `user-profile-${id}`,
    cacheTime: 300000,  // 5分钟缓存
  }
)
```

## 🎯 高级功能

### 竞态控制

当快速切换参数时（如搜索输入），useAsyncTask 会自动取消旧请求，只保留最新请求的结果。

```tsx
const [userId, setUserId] = useState('1')

const { data } = useAsyncTask(
  async (id: string) => fetchUser(id),
  {
    immediate: true,
    dependencies: [userId],
  }
)

// 快速切换 userId 时，只有最后一次请求的结果会被显示
```

### 缓存管理

缓存基于 `taskKey` 和时间戳，在有效期内会直接返回缓存数据。

```tsx
const { data, lastUpdated } = useAsyncTask(
  async (id: string) => fetchData(id),
  {
    taskKey: (id) => `data-${id}`,
    cacheTime: 60000,  // 60秒缓存
  }
)

// 可以通过 lastUpdated 判断数据是否来自缓存
console.log('数据更新时间:', new Date(lastUpdated))
```

### 轮询控制

轮询会在上次请求完成后等待指定间隔再发起下次请求，避免请求堆积。

```tsx
const [enabled, setEnabled] = useState(true)

const { data, cancel } = useAsyncTask(
  async () => fetchRealtimeData(),
  {
    immediate: enabled,
    dependencies: [enabled],
    pollingInterval: enabled ? 3000 : 0,
  }
)

// 停止轮询
const stopPolling = () => {
  cancel()
  setEnabled(false)
}
```

## ⚠️ 注意事项

1. **不支持 SSR**: 此 hook 设计用于客户端，不支持服务端渲染。

2. **内存缓存**: 缓存仅存在于内存中，刷新页面后会清空。

3. **取消机制**: `cancel()` 不会真正中断 Promise 执行，只会忽略其结果。如果需要真正取消请求，请在 action 中使用 AbortController。

4. **依赖数组**: `dependencies` 的行为类似 `useEffect`，变化时会重置状态并重新执行。

5. **taskKey 与缓存**: 只有设置了 `taskKey` 才会启用缓存和跨组件状态共享。

6. **immediate 和 dependencies**: ⚠️ 不建议同时使用 `immediate` 和 `dependencies`。如果需要更复杂的控制逻辑，建议在组件中使用 `useEffect` 手动调用 `execute`。

## 🔧 开发

```bash
# 安装依赖
pnpm install

# 构建包
pnpm build

# 运行 Demo
pnpm dev:web
```

## 📝 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📚 相关项目

- [SWR](https://swr.vercel.app/)
- [React Query](https://tanstack.com/query/latest)
- [useSWR](https://github.com/vercel/swr)
