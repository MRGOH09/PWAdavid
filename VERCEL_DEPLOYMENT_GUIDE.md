# 🚀 PWA-Google Vercel部署完整指南

## 📋 部署方式选择

### 方式1：通过Vercel Dashboard（推荐）

1. **访问Vercel Dashboard**
   - 打开 https://vercel.com/dashboard
   - 点击 "Add New..." → "Project"

2. **导入Git仓库**
   - 选择 GitHub 仓库
   - 选择 `VERCELtelegram` 仓库

3. **配置项目设置**
   ```
   Framework Preset: Next.js
   Root Directory: pwa-google
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **添加环境变量**（重要！）
   ```bash
   # 必需的变量
   SUPABASE_URL=https://ezrpmrnfdvtfxwnyekzi.supabase.co
   SUPABASE_SERVICE_KEY=[你的service_role密钥]
   SUPABASE_ANON_KEY=[你的anon密钥]
   JWT_SECRET=[你的JWT密钥]
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=[你的Google Client ID]
   
   # 可选变量
   TELEGRAM_BOT_TOKEN=[你的bot token]
   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=learner_club_bot
   ```

5. **点击Deploy**

### 方式2：通过Vercel CLI

```bash
# 1. 安装Vercel CLI（如果还没安装）
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
cd /Users/gohchengyee/versalsupabase/pwa-google
vercel --prod
```

## 🔍 可能遇到的问题及解决方案

### 问题1：node_modules错误
**症状**：`Cannot find module '../server/require-hook'`

**解决方案**：
```bash
# 方案A：清理并重装
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 方案B：使用yarn
rm -rf node_modules package-lock.json
yarn install

# 方案C：指定npm registry
npm config set registry https://registry.npmjs.org/
npm install
```

### 问题2：网络连接问题
**症状**：`ECONNRESET` 或 `npm error network`

**解决方案**：
```bash
# 1. 检查网络代理
npm config get proxy
npm config get https-proxy

# 2. 如果有代理，清除它
npm config delete proxy
npm config delete https-proxy

# 3. 使用淘宝镜像（中国地区）
npm config set registry https://registry.npmmirror.com

# 4. 或使用cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

### 问题3：构建内存不足
**症状**：`JavaScript heap out of memory`

**解决方案**：
```bash
# 增加Node内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 问题4：环境变量未生效
**症状**：部署后显示环境变量缺失

**解决方案**：
1. 在Vercel Dashboard确认变量已添加
2. 选择所有环境（Production, Preview, Development）
3. 重新部署：Deployments → Redeploy

### 问题5：Google OAuth错误
**症状**：`Error 400: redirect_uri_mismatch`

**解决方案**：
1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials → 你的OAuth 2.0 Client
3. 添加授权JavaScript来源：
   ```
   https://[你的项目名].vercel.app
   https://[你的项目名]-[用户名].vercel.app
   ```

## 📊 部署状态检查

### 检查部署是否成功
1. **查看部署URL**
   - Vercel Dashboard → 你的项目 → Deployments
   - 状态应该是 "Ready" ✅

2. **测试关键功能**
   ```
   https://[你的部署URL]/api/health
   https://[你的部署URL]/api/debug-env
   https://[你的部署URL]/login-new
   ```

3. **查看函数日志**
   - Vercel Dashboard → Functions → Logs
   - 或使用CLI：`vercel logs --follow`

## 🛠️ 本地调试部署问题

### 1. 模拟Vercel环境
```bash
# 使用vercel dev在本地模拟
vercel dev --listen 3002
```

### 2. 检查构建输出
```bash
# 本地构建测试
npm run build
# 查看.next目录结构
ls -la .next/
```

### 3. 环境变量测试
创建 `.env.local` 文件：
```env
SUPABASE_URL=你的值
SUPABASE_SERVICE_KEY=你的值
SUPABASE_ANON_KEY=你的值
JWT_SECRET=你的值
NEXT_PUBLIC_GOOGLE_CLIENT_ID=你的值
```

然后运行：
```bash
npm run dev
# 访问 http://localhost:3002/api/debug-env
```

## ✅ 成功部署后的配置

### 1. 自定义域名（可选）
- Vercel Dashboard → Settings → Domains
- 添加你的域名
- 配置DNS记录

### 2. 性能监控
- Vercel Dashboard → Analytics
- 启用Web Analytics
- 监控Core Web Vitals

### 3. 环境变量管理
- 使用Vercel CLI拉取配置：`vercel env pull`
- 批量更新：`vercel env add`

## 🚨 紧急回滚

如果部署出现严重问题：
```bash
# 查看部署历史
vercel ls

# 回滚到上一个版本
vercel rollback

# 或指定版本
vercel rollback [deployment-url]
```

## 📞 获取帮助

### 查看详细错误
```bash
# 查看构建日志
vercel inspect [deployment-url]

# 查看运行时日志
vercel logs [deployment-url]
```

### 社区支持
- [Vercel Discord](https://vercel.com/discord)
- [GitHub Discussions](https://github.com/vercel/vercel/discussions)

### 项目特定问题
- 检查 `/pwa-google/README.md`
- 查看 `/pwa-google/GOOGLE_OAUTH_SETUP.md`
- 参考 `/pwa-google/VERCEL_ENV_VARIABLES.md`

---

## 🎯 快速部署检查清单

- [ ] Git仓库已推送最新代码
- [ ] 本地`npm run build`成功
- [ ] 所有必需环境变量已配置
- [ ] Google OAuth域名已添加
- [ ] Vercel项目Root Directory设置正确
- [ ] 部署状态显示"Ready"
- [ ] 可以访问部署URL
- [ ] Google登录功能正常

💡 **最重要的提示**：如果遇到问题，先检查环境变量配置是否正确！90%的部署问题都与此相关。