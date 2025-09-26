import { useState } from 'react'
import Layout from '../components/Layout'
import { useRouter } from 'next/router'

export default function InstallGuide() {
  const router = useRouter()
  const [platform, setPlatform] = useState('ios')
  
  return (
    <Layout title="安装指南 - LEARNER CLUB">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* 头部 */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <button
              onClick={() => router.back()}
              className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
            >
              ← 返回
            </button>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              📱 PWA 安装指南
            </h1>
            <p className="text-gray-600">
              将 LEARNER CLUB 安装到您的设备，享受原生应用体验
            </p>
          </div>

          {/* 平台选择 */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setPlatform('ios')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  platform === 'ios'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🍎 iOS (iPhone/iPad)
              </button>
              <button
                onClick={() => setPlatform('android')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  platform === 'android'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🤖 Android
              </button>
            </div>

            {/* iOS 安装步骤 */}
            {platform === 'ios' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-blue-800 font-medium">⚠️ 重要提示</p>
                  <p className="text-blue-700 text-sm mt-1">
                    iOS 必须使用 Safari 浏览器安装，不支持 Chrome 或其他浏览器
                  </p>
                </div>

                <div className="space-y-6">
                  <Step 
                    number="1"
                    title="打开 Safari 浏览器"
                    description="访问 https://pwagoogle.vercel.app"
                    icon="🌐"
                  />
                  
                  <Step 
                    number="2"
                    title="点击分享按钮"
                    description="点击底部工具栏中间的分享图标 📤"
                    icon="📤"
                  />
                  
                  <Step 
                    number="3"
                    title="添加到主屏幕"
                    description="在分享菜单中向下滑动，找到「添加到主屏幕」"
                    icon="➕"
                  />
                  
                  <Step 
                    number="4"
                    title="确认添加"
                    description="可修改应用名称，然后点击右上角「添加」"
                    icon="✅"
                  />
                  
                  <Step 
                    number="5"
                    title="完成安装"
                    description="返回主屏幕即可看到应用图标"
                    icon="🎉"
                  />
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-900 mb-2">系统要求</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• iOS 11.3 或更高版本</li>
                    <li>• 必须使用 Safari 浏览器</li>
                    <li>• 需要网络连接</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Android 安装步骤 */}
            {platform === 'android' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <p className="text-green-800 font-medium">💡 提示</p>
                  <p className="text-green-700 text-sm mt-1">
                    Android 支持多种浏览器安装，推荐使用 Chrome
                  </p>
                </div>

                <div className="space-y-6">
                  <Step 
                    number="1"
                    title="打开 Chrome 浏览器"
                    description="访问 https://pwagoogle.vercel.app"
                    icon="🌐"
                  />
                  
                  <Step 
                    number="2"
                    title="等待安装提示"
                    description="页面加载完成后会自动弹出安装提示"
                    icon="📲"
                  />
                  
                  <Step 
                    number="3"
                    title="点击安装"
                    description="在弹出的对话框中点击「安装」"
                    icon="➕"
                  />
                  
                  <Step 
                    number="4"
                    title="完成安装"
                    description="应用图标会自动添加到主屏幕"
                    icon="🎉"
                  />
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-xl">
                  <h3 className="font-medium text-gray-900 mb-2">手动安装（如无自动提示）</h3>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. 点击右上角三点菜单 ⋮</li>
                    <li>2. 选择「安装应用」或「添加到主屏幕」</li>
                    <li>3. 确认安装</li>
                  </ol>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-900 mb-2">系统要求</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Android 5.0 或更高版本</li>
                    <li>• Chrome 73 或更高版本</li>
                    <li>• 支持 Edge、Samsung Internet 等浏览器</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* PWA 优势 */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ✨ PWA 优势
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Feature 
                icon="⚡"
                title="超小体积"
                description="安装包小于 1MB，节省存储空间"
              />
              <Feature 
                icon="🔄"
                title="自动更新"
                description="静默更新，始终使用最新版本"
              />
              <Feature 
                icon="📱"
                title="原生体验"
                description="全屏模式，像原生应用一样流畅"
              />
              <Feature 
                icon="🌐"
                title="跨平台"
                description="一个版本支持所有设备"
              />
              <Feature 
                icon="🔔"
                title="推送通知"
                description="及时接收重要提醒"
              />
              <Feature 
                icon="📴"
                title="离线支持"
                description="部分功能支持离线使用"
              />
            </div>
          </div>

          {/* 常见问题 */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ❓ 常见问题
            </h2>
            <div className="space-y-4">
              <FAQ 
                question="安装后如何更新？"
                answer="打开应用时会自动检查更新，下拉刷新即可获取最新版本。"
              />
              <FAQ 
                question="可以离线使用吗？"
                answer="部分功能支持离线，但记账和同步功能需要网络连接。"
              />
              <FAQ 
                question="如何卸载 PWA？"
                answer="iOS：长按图标点击删除。Android：长按图标选择卸载。"
              />
              <FAQ 
                question="无法安装怎么办？"
                answer="1. 清除浏览器缓存 2. 更新浏览器版本 3. 确保有足够存储空间"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// 步骤组件
function Step({ number, title, description, icon }) {
  return (
    <div className="flex space-x-4">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
          {number}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xl">{icon}</span>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}

// 特性组件
function Feature({ icon, title, description }) {
  return (
    <div className="flex space-x-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

// FAQ 组件
function FAQ({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-medium text-gray-900">{question}</span>
        <span className="text-gray-400 text-xl">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <p className="mt-3 text-gray-600 text-sm">{answer}</p>
      )}
    </div>
  )
}