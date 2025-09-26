# 🚨 PWA-Google Vercel部署故障排查指南

## 🔍 部署前检查清单

### 1. 本地测试
```bash
cd pwa-google
npm install
npm run build
npm run start
```
访问 http://localhost:3002 确认正常运行

### 2. 环境变量检查
确保在Vercel Dashboard配置了所有必需的环境变量：
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_KEY  
- ✅ SUPABASE_ANON_KEY
- ✅ JWT_SECRET
- ✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID

## 🛠️ 使用Vercel CLI部署

### 方法1：CLI部署（推荐）
```bash
# 1. 登录Vercel
vercel login

# 2. 进入项目目录
cd pwa-google

# 3. 部署（首次会询问项目配置）
vercel

# 回答以下问题：
# Set up and deploy? Y
# Which scope? 选择你的账户
# Link to existing project? N（如果是新项目）
# Project name? pwa-google
# In which directory? ./
# Override settings? N
```

### 方法2：指定配置部署
```bash
cd pwa-google
vercel --prod \
  --env SUPABASE_URL="你的值" \
  --env SUPABASE_SERVICE_KEY="你的值" \
  --env JWT_SECRET="你的值" \
  --env NEXT_PUBLIC_GOOGLE_CLIENT_ID="你的值"
```

### 方法3：从环境文件部署
```bash
cd pwa-google
# 创建.env.production文件后
vercel --prod --env-file .env.production
```

## ❌ 常见部署错误及解决方案

### 1. 构建错误：Module not found
**错误信息**：
```
Module not found: Can't resolve '@/components/xxx'
```

**解决方案**：
```bash
# 检查依赖
npm install
# 清理缓存
rm -rf node_modules .next
npm install
npm run build
```

### 2. 构建错误：Missing environment variables
**错误信息**：
```
Error: Missing required environment variable: NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

**解决方案**：
1. 在Vercel Dashboard添加环境变量
2. 或在部署时指定：
```bash
vercel --env NEXT_PUBLIC_GOOGLE_CLIENT_ID="你的ID"
```

### 3. 运行时错误：500 Internal Server Error
**常见原因**：
- 数据库连接失败
- JWT密钥错误
- API路由错误

**调试步骤**：
1. 查看Vercel函数日志：
```bash
vercel logs [deployment-url]
```

2. 访问调试端点：
- `/api/debug-env` - 检查环境变量
- `/api/debug-auth` - 测试认证

### 4. Google登录错误：Unauthorized origin
**错误信息**：
```
Error 400: redirect_uri_mismatch
```

**解决方案**：
1. 在Google Cloud Console添加授权域名：
   - https://pwa-google.vercel.app
   - https://你的自定义域名.com
2. 添加重定向URI（如果需要）：
   - https://pwa-google.vercel.app/api/auth/callback/google

### 5. 数据库连接错误
**错误信息**：
```
Error: Invalid Supabase credentials
```

**解决方案**：
1. 确认SUPABASE_URL格式正确（https://xxx.supabase.co）
2. 检查SERVICE_KEY是否完整（很长的JWT token）
3. 测试连接：
```javascript
// 创建test-db.js
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
supabase.from('users').select('*').limit(1).then(console.log)
```

### 6. PWA安装问题
**问题**：无法安装PWA

**检查项**：
1. HTTPS是否启用（Vercel自动提供）
2. manifest.json是否正确
3. Service Worker是否注册
4. 图标文件是否存在

### 7. 端口冲突
**错误**：Port 3002 is already in use

**解决方案**：
```bash
# 查找占用端口的进程
lsof -i :3002
# 终止进程
kill -9 [PID]
# 或使用其他端口
PORT=3003 npm run dev
```

## 📊 部署状态检查

### 查看部署列表
```bash
vercel ls
```

### 查看部署详情
```bash
vercel inspect [deployment-url]
```

### 查看实时日志
```bash
vercel logs [deployment-url] --follow
```

### 回滚到上一个版本
```bash
vercel rollback [deployment-url]
```

## 🔧 高级调试技巧

### 1. 启用详细日志
```javascript
// 在API路由中添加
console.log('[API_NAME]', {
  method: req.method,
  headers: req.headers,
  body: req.body,
  env: {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasJWT: !!process.env.JWT_SECRET
  }
})
```

### 2. 创建健康检查端点
创建 `pages/api/health.js`：
```javascript
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    hasRequiredEnv: {
      supabase: !!process.env.SUPABASE_URL,
      jwt: !!process.env.JWT_SECRET,
      google: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    }
  })
}
```

### 3. 本地模拟Vercel环境
```bash
# 安装Vercel CLI
npm i -g vercel

# 本地运行Vercel环境
vercel dev
```

## 🎯 成功部署检查清单

- [ ] 部署状态显示 "Ready"
- [ ] 可以访问首页
- [ ] Google登录按钮可点击
- [ ] 登录后能获取用户信息
- [ ] 数据可以正常读写
- [ ] PWA可以安装
- [ ] 环境变量都已配置

## 🆘 获取帮助

### Vercel支持
- [Vercel文档](https://vercel.com/docs)
- [Vercel社区](https://github.com/vercel/vercel/discussions)

### 项目相关
- 检查 `pwa-google/README.md`
- 查看 `pwa-google/GOOGLE_OAUTH_SETUP.md`
- 参考 `pwa-google/VERCEL_ENV_VARIABLES.md`

### 日志位置
- Vercel Dashboard → Functions → Logs
- 本地：`.next/server/logs/`

---
💡 **提示**：大部分部署问题都是由于环境变量配置错误引起的。请仔细检查每个变量的值！