# 🎯 PWA-Google OAuth配置修复清单

## 立即检查（按优先级）

### 1. Google Cloud Console ⚠️ 最高优先级
访问：https://console.cloud.google.com
- **Authorized redirect URIs** 必须包含：
  ```
  https://ezrpmrnfdvtfxwnyekzi.supabase.co/auth/v1/callback
  ```
- **Authorized JavaScript origins** 建议添加：
  ```
  https://pwagoogle.vercel.app
  https://pwagoogle-git-main-mrgoh09s-projects.vercel.app
  ```

### 2. Supabase控制台检查
访问：https://supabase.com/dashboard/project/ezrpmrnfdvtfxwnyekzi

#### Auth → URL Configuration
- **SITE_URL**: `https://pwagoogle.vercel.app`
- **Redirect URLs** 确认包含：
  ```
  https://pwagoogle.vercel.app/**
  https://pwagoogle-*-mrgoh09s-projects.vercel.app/**
  https://pwagoogle.vercel.app/auth/callback
  https://pwagoogle.vercel.app/test-auth-flow
  ```

### 3. 代码修复
当前问题：setSession时的"Invalid API key"错误

#### 最简单的解决方案：
```javascript
// 直接让Supabase自动处理URL hash，不手动setSession
const { data, error } = await supabase.auth.getSessionFromUrl()
```

## 测试流程
1. 修复上述配置后
2. 清除浏览器缓存和cookie
3. 访问 https://pwagoogle.vercel.app/test-auth-flow
4. 测试OAuth流程

## 当前状态
- ✅ 域名跳转问题已解决
- ✅ Implicit Flow token检测正常
- ✅ callback页面正确识别参数
- ❌ setSession API key错误 ← **当前需要解决**

## 备注
基于Vercel + Supabase + Google OAuth最佳实践配置
参考：https://supabase.com/docs/guides/auth/social-login/auth-google