# Supabase原生Google OAuth设置指南

## 🎯 概述

Supabase提供原生的Google OAuth集成，比自定义实现更简单、更安全。这个指南会帮你设置完整的Google认证系统。

## 📋 设置步骤

### 1. Google Cloud Console设置

#### 1.1 创建项目
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 项目名称建议：`learner-club-pwa`

#### 1.2 启用API
1. 转到"API和服务" → "库"
2. 搜索并启用：**Google Identity API**

#### 1.3 配置OAuth同意屏幕
1. 转到"API和服务" → "OAuth同意屏幕"
2. 选择"外部"用户类型
3. 填写必需信息：
   - **应用名称**: Learner Club PWA
   - **用户支持邮箱**: 你的邮箱
   - **授权域名**: `verce-ltelegram.vercel.app`

#### 1.4 创建OAuth客户端ID
1. 转到"API和服务" → "凭据"
2. 点击"创建凭据" → "OAuth客户端ID"
3. 选择"Web应用"
4. 配置URL：

**授权的JavaScript来源**:
```
http://localhost:3002
https://verce-ltelegram.vercel.app
```

**授权的重定向URI**:
```
https://ezrpmrnfdvtfxwnyekzi.supabase.co/auth/v1/callback
```

5. 保存**Client ID**（稍后需要）

### 2. Supabase Dashboard设置

#### 2.1 启用Google认证
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目：`ezrpmrnfdvtfxwnyekzi`
3. 转到 **Authentication** → **Providers**
4. 找到**Google**，点击启用
5. 输入从Google获得的**Client ID**和**Client Secret**

#### 2.2 配置重定向URL
在Supabase中，确认以下重定向URL已配置：
- `http://localhost:3002/auth/callback`（开发）
- `https://verce-ltelegram.vercel.app/auth/callback`（生产）

### 3. 环境变量配置

#### 3.1 本地开发 (.env.local)
```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://ezrpmrnfdvtfxwnyekzi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的匿名密钥

# Google OAuth (从Google Cloud Console获取)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=你的Google_Client_ID
```

#### 3.2 Vercel生产环境
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. Settings → Environment Variables
4. 添加相同的环境变量

### 4. 代码实现

已经创建的文件：
- `/pages/login-supabase.js` - Supabase原生登录页面
- `/pages/auth/callback.js` - OAuth回调处理

主要特点：
- 使用Supabase `signInWithOAuth()`
- 自动处理OAuth流程
- 兼容现有的localStorage token系统
- 无需自定义JWT处理

### 5. 使用方法

#### 5.1 本地测试
```bash
npm run dev
```
访问：http://localhost:3002/login-supabase

#### 5.2 生产环境
访问：https://verce-ltelegram.vercel.app/login-supabase

### 6. 工作流程

1. **用户点击"使用Google登录"**
2. **Supabase重定向到Google OAuth**
3. **Google认证后回调到Supabase**
4. **Supabase重定向到 `/auth/callback`**
5. **处理session并保存到localStorage**
6. **跳转到PWA首页**

### 7. 优势

相比自定义实现：
✅ **更安全** - Supabase处理所有OAuth安全问题
✅ **更简单** - 无需自定义JWT逻辑
✅ **更稳定** - 基于成熟的认证服务
✅ **自动更新** - Supabase自动维护OAuth标准
✅ **内置功能** - 用户管理、会话处理等

### 8. 数据库集成

Supabase会自动：
- 创建 `auth.users` 表中的用户记录
- 存储Google用户信息
- 管理会话和token刷新
- 提供用户元数据（email, name, picture等）

你可以通过以下方式访问用户数据：
```javascript
const { data: { user } } = await supabase.auth.getUser()
console.log(user.email, user.user_metadata.name)
```

### 9. 故障排除

#### 常见问题：

**"重定向URI不匹配"**
- 检查Google Console中的重定向URI
- 确保使用Supabase提供的回调URL

**"Client ID无效"**
- 检查环境变量是否正确设置
- 确认Client ID来自正确的Google项目

**"会话未建立"**
- 检查浏览器控制台错误信息
- 确认callback页面正确处理

### 10. 相关文件

- `pages/login-supabase.js` - 原生Supabase登录页面
- `pages/auth/callback.js` - OAuth回调处理
- `SUPABASE_GOOGLE_AUTH_SETUP.md` - 此配置文档

---

## 🚀 开始使用

1. 按照上述步骤配置Google和Supabase
2. 设置环境变量
3. 访问 `/login-supabase` 测试登录
4. 享受简单、安全的Google认证！