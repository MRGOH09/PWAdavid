# 📊 Learner Club PWA

基于Next.js开发的渐进式Web应用(PWA)，为Learner Club财务管理挑战系统提供优质的移动端用户体验。

## ✨ 特性

- 📱 **PWA支持** - 可安装到手机主屏幕，提供原生应用体验
- 🔐 **Telegram登录** - 使用Telegram账号安全登录
- 📊 **数据可视化** - 清晰直观的财务数据展示
- 💾 **离线支持** - 基本的离线数据查看功能
- 📱 **响应式设计** - 完美适配手机和平板设备
- ⚡ **性能优化** - 快速加载和流畅交互

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- npm 或 yarn

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 环境配置

复制环境变量模板并填入配置：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入以下配置：

```env
# Supabase配置
SUPABASE_URL=你的supabase项目URL
SUPABASE_ANON_KEY=你的supabase匿名密钥

# JWT密钥
JWT_SECRET=你的JWT密钥

# Telegram配置
TELEGRAM_BOT_TOKEN=你的Telegram机器人Token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=你的机器人用户名
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

访问 [http://localhost:3001](http://localhost:3001) 查看应用。

### 构建生产版本

```bash
npm run build
npm run start
# 或
yarn build
yarn start
```

## 📁 项目结构

```
pwa/
├── pages/                 # Next.js页面
│   ├── api/pwa/          # PWA专用API端点
│   ├── index.js          # 首页/仪表板
│   ├── login.js          # 登录页
│   └── profile.js        # 个人中心
├── components/           # React组件
│   ├── Layout.js         # 页面布局
│   ├── Card.js          # 卡片组件
│   ├── Button.js        # 按钮组件
│   └── LoadingSpinner.js # 加载状态
├── lib/                  # 工具库
│   ├── auth.js          # 认证相关
│   └── api.js           # API客户端
├── styles/              # 样式文件
│   └── globals.css      # 全局样式
├── public/              # 静态资源
│   ├── manifest.json    # PWA配置
│   ├── sw.js           # Service Worker
│   └── icons/          # 应用图标
└── README.md           # 项目文档
```

## 🔧 核心功能

### 1. 认证系统

- 使用Telegram Login Widget进行安全登录
- JWT Token管理用户会话
- 自动处理登录状态检查和重定向

### 2. 仪表板

- 显示用户基本信息和分行
- 月度财务数据概览
- 三类支出统计(生活开销/学习投资/储蓄投资)
- 最近记录列表

### 3. 个人中心

- 用户资料展示
- 记录统计数据
- 功能菜单导航
- 安全退出登录

### 4. PWA功能

- 离线缓存策略
- 可安装到主屏幕
- 原生应用般的用户体验

## 🔌 API集成

PWA通过以下API与后端系统集成：

- `/api/pwa/auth` - Telegram认证处理
- `/api/pwa/data` - 统一数据接口

所有API调用都经过JWT Token验证，确保数据安全。

## 📱 PWA配置

### Manifest文件

`public/manifest.json` 定义了PWA的基本信息：

- 应用名称和描述
- 图标和主题色
- 显示模式和启动URL
- 快捷方式配置

### Service Worker

`public/sw.js` 实现了：

- 静态资源缓存
- API响应缓存
- 离线回退策略

## 🎨 设计系统

### 色彩规范

- Primary: `#1677ff` - 主题蓝色
- Success: `#52c41a` - 成功绿色  
- Danger: `#f5222d` - 危险红色
- Warning: `#faad14` - 警告黄色

### 组件库

基于Tailwind CSS构建，包含：

- Card: 卡片容器组件
- Button: 多变体按钮组件
- StatCard: 统计数字卡片
- LoadingSpinner: 加载状态组件

## 🚀 部署

### Vercel部署

1. 将代码推送到GitHub仓库
2. 在Vercel中导入项目
3. 配置环境变量
4. 自动构建和部署

### 环境变量配置

在Vercel项目设置中添加以下环境变量：

```
SUPABASE_URL
SUPABASE_ANON_KEY  
JWT_SECRET
TELEGRAM_BOT_TOKEN
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
```

## 📊 性能优化

- 代码分割和懒加载
- 图片优化和压缩
- PWA缓存策略
- 移动端性能优化

## 🔒 安全考虑

- JWT Token安全存储
- HTTPS强制使用
- XSS和CSRF防护
- API访问控制

## 🐛 故障排除

### 常见问题

1. **Telegram登录失败**
   - 检查bot username配置
   - 验证域名白名单设置

2. **数据加载失败**
   - 检查API端点连接
   - 验证JWT Token有效性

3. **PWA安装问题**
   - 检查manifest.json配置
   - 验证HTTPS部署

## 📄 许可证

本项目仅用于Learner Club内部使用。

## 🤝 贡献

项目由Claude Code基于用户需求开发完成。

---

🎯 **目标**: 为Learner Club用户提供优质的移动端财务管理体验

📱 **体验**: PWA提供接近原生应用的用户体验，同时保持Web的便利性