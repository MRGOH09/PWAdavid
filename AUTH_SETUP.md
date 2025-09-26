# Google 认证接入（基于 Supabase Provider）

推荐使用 Supabase 自带的 Google Provider，稳定、少配置、无需在前端保存 Client Secret。

## 一、准备信息
- Supabase 项目：获取 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_KEY`
- Vercel 项目域名：如 `https://pwadavid.vercel.app`（或你的自定义域名）
- 本地开发域名：`http://localhost:3002`

## 二、Google Cloud 创建 OAuth 客户端
1. 进入 Google Cloud Console → API 和服务 → 凭据
2. 创建凭据 → OAuth 客户端 ID → 类型选择「Web 应用」
3. 授权的 JavaScript 来源（Origins）添加：
   - `http://localhost:3002`
   - `https://你的线上域名`
4. 授权的重定向 URI（Redirect URIs）添加：
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   （这是 Supabase 的回调地址）
5. 记录生成的 Client ID 与 Client Secret

> 注意：这里的回调 URI 指向 Supabase，而不是你站点的 `/auth/callback`。`/auth/callback` 仅作为 Supabase 登录完成后的前端跳转地址。

## 三、Supabase 配置 Provider
1. Supabase 控制台 → Authentication → Providers → Google
2. 填入上一步生成的 Client ID 与 Client Secret，保存开启
3. Authentication → URL Configuration：
   - Site URL：`https://你的线上域名`
   - Additional Redirect URLs：可添加 `http://localhost:3002` 方便本地调试

## 四、Vercel 环境变量
在 Vercel 项目里设置（参考 `.env.example`）：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`（自定义接口需要，保持强随机）
- （可选）`NEXT_PUBLIC_GOOGLE_CLIENT_ID`（自定义 Google 登录页面用）

## 五、前端登录入口
- 推荐入口：`/login-supabase`
  - 使用 `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } })`
  - Supabase 完成 Google 登录后，会回跳到 `/auth/callback`，再进入应用 `/`

## 六、本地验证
1. `npm install && npm run dev`（端口 3002）
2. 访问 `http://localhost:3002/login-supabase` → 点击 Google 登录
3. 完成后应跳转到首页 `/`，可在浏览器 Application → Local Storage/Supabase 检查 session

## 七、常见问题
- 401/redirect 错误：检查 Google 的 JavaScript 来源与 Redirect URI 是否与 Supabase/域名一致
- 登录后白屏或循环跳转：检查 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否正确，Supabase Auth URL 配置是否写了正确的站点域名
- 生产与本地互相干扰：Google OAuth 的授权来源与 Supabase 的 URL 配置需要同时包含两个环境

## 八、可选：自定义 Google 登录
如需走 `pages/api/pwa/google-auth.js` 的自定义流程：
- 设置 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 与 `JWT_SECRET`
- 在 `lib/auth.js` 中完善 `verifyGoogleToken`：生产环境调用 Google tokeninfo 校验 idToken
- 仅在你确实需要自己签发 JWT 时使用；否则优先使用 Supabase Provider

