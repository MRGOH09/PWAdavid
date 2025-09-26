# Google OAuth 设置指南

## 快速设置步骤

### 1. 创建Google Cloud项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 项目名称建议：`learner-club-pwa`

### 2. 启用Google Identity API

1. 在控制台中，转到"API和服务" > "库"
2. 搜索"Google Identity API" 或 "Google Sign-In API"
3. 点击启用

### 3. 创建OAuth 2.0凭据

1. 转到"API和服务" > "凭据"
2. 点击"创建凭据" > "OAuth客户端ID"
3. 如果需要，先配置OAuth同意屏幕：
   - 用户类型：外部
   - 应用名称：Learner Club PWA
   - 用户支持邮箱：你的邮箱
   - 授权域名：verce-ltelegram.vercel.app

### 4. 配置OAuth客户端

1. 应用类型：Web应用
2. 名称：Learner Club PWA Client
3. 授权的JavaScript来源：
   ```
   http://localhost:3001
   https://verce-ltelegram.vercel.app
   ```
4. 授权的重定向URI（可选）：
   ```
   http://localhost:3001/api/auth/callback/google
   https://verce-ltelegram.vercel.app/api/auth/callback/google
   ```

### 5. 获取Client ID

创建后，你会得到：
- **Client ID**: 类似 `123456789-xxxxx.apps.googleusercontent.com`
- **Client Secret**: 保密密钥（当前方案不需要）

### 6. 配置环境变量

在 `.env.local` 文件中添加：

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=你的Client_ID
```

在 Vercel 中添加环境变量：
1. 访问 Vercel Dashboard
2. 选择你的项目
3. Settings > Environment Variables
4. 添加 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## 测试登录

1. 本地测试：
   ```bash
   npm run dev
   ```
   访问：http://localhost:3001/login-new

2. 生产环境：
   访问：https://verce-ltelegram.vercel.app/login-new

## 功能说明

- **首次登录**：自动创建PWA账号
- **再次登录**：使用同一Google账号直接登录
- **数据存储**：用户数据存储在Supabase数据库
- **JWT认证**：生成30天有效的JWT token

## 安全注意事项

1. Client ID是公开的，可以安全地暴露在前端
2. Client Secret必须保密（我们的方案不使用）
3. JWT_SECRET必须保密，用于签名token
4. 所有用户数据通过HTTPS传输

## 故障排除

### 常见问题

1. **"Google登录失败"**
   - 检查Client ID是否正确
   - 确认域名已添加到授权来源

2. **"未授权的来源"**
   - 在Google Console添加当前域名到授权JavaScript来源

3. **"无法创建用户"**
   - 检查Supabase连接
   - 查看API日志确认数据库字段

## 相关文件

- `/pages/login-new.js` - 新的登录页面
- `/pages/api/pwa/auth-google.js` - Google认证API
- `/lib/auth.js` - JWT验证逻辑