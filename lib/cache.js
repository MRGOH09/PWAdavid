// 智能缓存系统 - 解决页面切换lag问题
class SmartCache {
  constructor() {
    this.cache = new Map()
    this.timestamps = new Map()
    this.defaultTTL = 5 * 60 * 1000 // 5分钟
    this.maxSize = 50 // 最大缓存项数
  }

  // 生成缓存键
  getCacheKey(endpoint, action, params = {}) {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort())
    return `${endpoint}:${action}:${sortedParams}`
  }

  // 检查缓存是否有效
  isValid(key, customTTL) {
    if (!this.cache.has(key)) return false
    
    const timestamp = this.timestamps.get(key)
    const ttl = customTTL || this.defaultTTL
    const now = Date.now()
    
    return (now - timestamp) < ttl
  }

  // 获取缓存数据
  get(endpoint, action, params = {}, customTTL) {
    const key = this.getCacheKey(endpoint, action, params)
    
    if (this.isValid(key, customTTL)) {
      console.log(`📦 缓存命中: ${key}`)
      // 更新访问时间，实现LRU
      this.timestamps.set(key, Date.now())
      return this.cache.get(key)
    }
    
    return null
  }

  // 设置缓存数据
  set(endpoint, action, params, data) {
    const key = this.getCacheKey(endpoint, action, params)
    
    // 清理过期缓存
    this.cleanup()
    
    // 如果缓存已满，清理最旧的项
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }
    
    this.cache.set(key, data)
    this.timestamps.set(key, Date.now())
    
    console.log(`💾 缓存设置: ${key}`)
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now()
    const keysToDelete = []
    
    this.timestamps.forEach((timestamp, key) => {
      if ((now - timestamp) > this.defaultTTL) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.timestamps.delete(key)
    })
    
    if (keysToDelete.length > 0) {
      console.log(`🗑️ 清理过期缓存: ${keysToDelete.length} 项`)
    }
  }

  // 清理最旧的缓存项
  evictOldest() {
    let oldestKey = null
    let oldestTime = Date.now()
    
    this.timestamps.forEach((timestamp, key) => {
      if (timestamp < oldestTime) {
        oldestTime = timestamp
        oldestKey = key
      }
    })
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.timestamps.delete(oldestKey)
      console.log(`♻️ 清理最旧缓存: ${oldestKey}`)
    }
  }

  // 清除特定缓存
  invalidate(endpoint, action, params = {}) {
    const key = this.getCacheKey(endpoint, action, params)
    this.cache.delete(key)
    this.timestamps.delete(key)
    console.log(`❌ 缓存失效: ${key}`)
  }

  // 清除所有缓存
  clear() {
    this.cache.clear()
    this.timestamps.clear()
    console.log('🧹 清空所有缓存')
  }

  // 预加载数据
  async preload(client, endpoint, action, params = {}) {
    const key = this.getCacheKey(endpoint, action, params)
    
    if (!this.isValid(key)) {
      console.log(`🔮 预加载: ${key}`)
      try {
        const data = await client.call(endpoint, action, params)
        this.set(endpoint, action, params, data)
        return data
      } catch (error) {
        console.error(`预加载失败: ${key}`, error)
        return null
      }
    }
    
    return this.get(endpoint, action, params)
  }
}

// 页面预加载策略
export class PagePreloader {
  constructor(client, cache) {
    this.client = client
    this.cache = cache
    this.preloadQueue = new Set()
  }

  // 预加载用户可能访问的页面数据
  async preloadUserData() {
    const tasks = [
      // 预加载仪表板数据
      { endpoint: 'data', action: 'getDashboard', priority: 'high' },
      // 预加载个人资料
      { endpoint: 'data', action: 'getProfile', priority: 'medium' },
      // 预加载最近记录
      { endpoint: 'data', action: 'getRecentRecords', priority: 'medium' }
    ]

    // 按优先级预加载
    for (const task of tasks.filter(t => t.priority === 'high')) {
      await this.preloadTask(task)
    }

    // 异步预加载中优先级任务
    setTimeout(() => {
      tasks.filter(t => t.priority === 'medium').forEach(task => {
        this.preloadTask(task)
      })
    }, 1000)
  }

  async preloadTask(task) {
    const { endpoint, action, params = {} } = task
    const cacheKey = this.cache.getCacheKey(endpoint, action, params)
    
    if (!this.preloadQueue.has(cacheKey)) {
      this.preloadQueue.add(cacheKey)
      
      try {
        await this.cache.preload(this.client, endpoint, action, params)
      } finally {
        this.preloadQueue.delete(cacheKey)
      }
    }
  }

  // 预加载下一页数据
  preloadNextPage(currentPage, dataType) {
    const nextPage = currentPage + 1
    setTimeout(() => {
      this.preloadTask({
        endpoint: 'data',
        action: 'getPageData',
        params: { page: nextPage, type: dataType }
      })
    }, 500)
  }
}

// 导出单例
export const smartCache = new SmartCache()

export default SmartCache