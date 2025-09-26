# 📋 PWA-Google Vercel 环境变量配置

## 🚀 快速部署步骤

### 1. 在Vercel创建新项目
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 导入Git仓库，选择 `pwa-google` 目录
4. 配置以下设置：
   - **Framework Preset**: Next.js
   - **Root Directory**: `pwa-google`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 2. 配置环境变量

在 **Environment Variables** 部分添加以下变量：

## 🔑 必需的环境变量

### Supabase 数据库配置
```
SUPABASE_URL=https://ezrpmrnfdvtfxwnyekzi.supabase.co
SUPABASE_SERVICE_KEY=[从Supabase获取的service_role密钥]
SUPABASE_ANON_KEY=[从Supabase获取的anon密钥]
```

### JWT认证配置
```
JWT_SECRET=[使用 openssl rand -hex 32 生成的密钥]
```
示例生成命令：
```bash
openssl rand -hex 32
```

### Google OAuth配置
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=[从Google Cloud Console获取的Client ID]
```
格式例如：`123456789-xxxxx.apps.googleusercontent.com`

### Telegram Bot配置（可选，用于跳转）
```
TELEGRAM_BOT_TOKEN=[从@BotFather获取的token]
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=learner_club_bot
```

### Web Push通知配置（可选）
```
NEXT_PUBLIC_FCM_VAPID_KEY=BHn7QgZMASGfPzs_t1h604Z5ku_HlpZufjZZgDO1qiPopryzLII_GaInmuHqiNMhypVkz99dy2ES8tknl8n-ncE
VAPID_PRIVATE_KEY=ipeX28Aw-OH1EVubf6M4P2azz3ijx5n6wp0Us7V6zEU
```

## 📝 环境变量完整列表

| 变量名 | 必需 | 说明 | 获取方式 |
|--------|------|------|----------|
| `SUPABASE_URL` | ✅ | Supabase项目URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase服务密钥 | Supabase Dashboard → Settings → API → service_role |
| `SUPABASE_ANON_KEY` | ✅ | Supabase匿名密钥 | Supabase Dashboard → Settings → API → anon |
| `JWT_SECRET` | ✅ | JWT签名密钥 | `openssl rand -hex 32` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ✅ | Google OAuth客户端ID | Google Cloud Console → APIs & Services → Credentials |
| `TELEGRAM_BOT_TOKEN` | ⚠️ | Telegram机器人Token | @BotFather |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | ⚠️ | Telegram机器人用户名 | @BotFather创建时设置 |
| `NEXT_PUBLIC_FCM_VAPID_KEY` | ❌ | Web Push公钥 | 已提供默认值 |
| `VAPID_PRIVATE_KEY` | ❌ | Web Push私钥 | 已提供默认值 |

### 图例说明：
- ✅ 必需：系统运行必须配置
- ⚠️ 可选：某些功能需要
- ❌ 可选：有默认值

## 🔧 获取密钥的详细步骤

### 1. Supabase密钥
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 左侧菜单 → Settings → API
4. 复制以下内容：
   - **Project URL**: 即 `SUPABASE_URL`
   - **anon public**: 即 `SUPABASE_ANON_KEY`
   - **service_role secret**: 即 `SUPABASE_SERVICE_KEY`

### 2. Google Client ID
1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. 创建OAuth 2.0 Client ID（如果还没有）
4. 配置授权域名：
   - 开发环境：`http://localhost:3002`
   - 生产环境：你的Vercel域名
5. 复制Client ID

### 3. JWT Secret生成
在终端运行：
```bash
openssl rand -hex 32
```
或使用在线生成器（确保安全）

## 🚨 重要安全提示

1. **不要提交到Git**: 确保 `.env.local` 在 `.gitignore` 中
2. **使用强密钥**: JWT_SECRET至少32字符
3. **限制CORS**: 在Supabase中配置允许的域名
4. **定期轮换**: 建议定期更新密钥
5. **环境隔离**: 开发和生产使用不同的密钥

## 🧪 测试配置

部署后访问以下端点测试：
- `/api/debug-env` - 检查环境变量状态（不会暴露密钥）
- `/api/debug-auth` - 测试认证系统
- `/login-new` - 测试Google登录

## 📋 Vercel配置截图位置

在Vercel Dashboard中：
1. 选择你的项目
2. Settings标签
3. Environment Variables部分
4. 添加所有必需变量
5. 选择所有环境（Production, Preview, Development）
6. 点击Save
7. 重新部署：Deployments → 最新部署 → Redeploy

## 🆘 常见问题

### Q: Google登录显示"未授权的来源"
A: 在Google Cloud Console添加你的Vercel域名到授权JavaScript来源

### Q: 数据库连接失败
A: 检查SUPABASE_URL和密钥是否正确，注意不要有多余空格

### Q: JWT验证失败
A: 确保JWT_SECRET在所有环境中一致

### Q: 部署成功但页面404
A: 检查Root Directory是否设置为 `pwa-google`

---
✅ **准备就绪**: 配置完以上环境变量后，你的PWA-Google应用即可在Vercel上独立运行！