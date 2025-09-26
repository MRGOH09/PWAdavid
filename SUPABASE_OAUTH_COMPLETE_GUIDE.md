# 🎯 Supabase Google OAuth 完整配置指南 (2024)

## 📋 核心概念理解

### Implicit Flow vs PKCE Flow

#### **Implicit Flow（隐式流）**
- Token在URL **hash fragment** 中返回 (`#access_token=...`)
- **仅限客户端**访问（浏览器不会发送hash到服务器）
- 适合纯客户端应用
- 安全性较低

#### **PKCE Flow（授权码交换流）**
- 使用authorization code在**query parameter**中返回 (`?code=...`)
- **支持服务端**访问
- 需要额外的code exchange步骤
- **推荐用于Next.js**（特别是SSR）
- 更安全

## 🔧 完整配置步骤

### 1. Google Cloud Console配置

#### 创建OAuth应用
1. 访问 [cloud.google.com](https://cloud.google.com)
2. 创建新项目或选择现有项目
3. 搜索 "OAuth" → 选择 "OAuth consent screen"
4. 选择 "External" 类型
5. 填写应用信息

#### 配置OAuth客户端
1. 进入 Credentials → Create Credentials → OAuth Client ID
2. 应用类型选择 "Web application"
3. 配置以下内容：

**Authorized JavaScript origins:**
```
https://pwagoogle.vercel.app
https://pwagoogle-*.vercel.app
http://localhost:3000  (开发环境)
```

**Authorized redirect URIs:**
```
https://ezrpmrnfdvtfxwnyekzi.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback  (如果使用PKCE)
https://pwagoogle.vercel.app/auth/callback  (如果使用PKCE)
```

### 2. Supabase Dashboard配置

#### Auth Providers设置
1. 进入 Authentication → Providers → Google
2. 输入从Google获取的：
   - Client ID
   - Client Secret

#### URL Configuration设置
1. 进入 Authentication → URL Configuration
2. 配置：

**Site URL:**
```
https://pwagoogle.vercel.app
```

**Redirect URLs:**（允许列表）
```
https://pwagoogle.vercel.app/**
https://pwagoogle-*.vercel.app/**
http://localhost:3000/**
```

### 3. Vercel环境变量

必须配置的环境变量：
```bash
# 客户端可见（NEXT_PUBLIC前缀）
NEXT_PUBLIC_SUPABASE_URL=https://ezrpmrnfdvtfxwnyekzi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 服务端使用
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Next.js代码实现

#### A. 使用PKCE Flow（推荐）

**创建Supabase客户端：**
```javascript
// utils/supabase/client.js
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

**OAuth登录：**
```javascript
const supabase = createClient()

await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent', // 获取refresh token
    }
  }
})
```

**Callback处理 (/auth/callback)：**
```javascript
// app/auth/callback/route.js (App Router)
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

#### B. 使用Implicit Flow（仅客户端）

**创建客户端（自动处理hash）：**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      detectSessionInUrl: true,  // 自动检测URL中的token
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'implicit'  // 明确指定使用implicit flow
    }
  }
)
```

**重要：Implicit Flow处理**
```javascript
// 页面组件
useEffect(() => {
  // Supabase会自动处理hash中的token
  // 不需要手动调用setSession
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user)
      }
    }
  )
  
  return () => subscription.unsubscribe()
}, [])
```

## ⚠️ 常见问题和解决方案

### 1. "Invalid API key" 错误

**原因：**
- 使用了错误的key（service key vs anon key）
- 手动setSession时token验证失败
- CORS或域名配置问题

**解决：**
- 确保使用ANON_KEY而非SERVICE_KEY
- 让Supabase自动处理token，不要手动setSession
- 配置detectSessionInUrl: true

### 2. Token在hash中但会话未建立

**原因：**
- 客户端未配置detectSessionInUrl
- 在服务端尝试访问hash（服务端无法访问）

**解决：**
```javascript
// 正确的客户端配置
const supabase = createClient(url, key, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
})
```

### 3. Vercel部署后认证失败

**原因：**
- 环境变量未正确设置
- Redirect URLs未包含Vercel域名

**解决：**
- 确保Vercel环境变量设置正确
- Supabase Redirect URLs包含所有Vercel域名变体

## 📝 最佳实践建议

1. **优先使用PKCE Flow**
   - 更安全
   - 支持SSR
   - Next.js推荐方案

2. **如果必须使用Implicit Flow**
   - 设置detectSessionInUrl: true
   - 不要手动setSession
   - 只在客户端处理

3. **环境变量管理**
   - 使用NEXT_PUBLIC_前缀用于客户端变量
   - Service key仅在服务端使用
   - Vercel中设置所有环境的变量

4. **调试技巧**
   - 检查浏览器Network标签中的请求
   - 查看Console中的Supabase日志
   - 验证URL中的token/code参数

## 🚀 快速诊断清单

- [ ] Google Cloud Console配置了正确的redirect URI？
- [ ] Supabase Dashboard配置了Google OAuth凭据？
- [ ] Supabase Redirect URLs包含所有域名？
- [ ] Vercel环境变量正确设置？
- [ ] 使用了正确的flow type（PKCE vs Implicit）？
- [ ] 客户端配置了detectSessionInUrl（如果用Implicit）？
- [ ] 没有手动调用setSession（让Supabase自动处理）？

---

*基于2024年最新的Supabase文档和最佳实践编写*