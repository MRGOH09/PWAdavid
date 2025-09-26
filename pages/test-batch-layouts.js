import { useState } from 'react'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import { PageHeader } from '../components/BrandHeader'

export default function TestBatchLayouts() {
  const [selectedLayout, setSelectedLayout] = useState('A')
  
  // 示例数据
  const sampleRecords = [
    { id: 1, date: '2025-09-01', group: 'A', category: '餐饮', amount: '25.50', note: '午餐' },
    { id: 2, date: '2025-09-01', group: 'A', category: '交通', amount: '15.00', note: '打车' },
    { id: 3, date: '2025-09-01', group: 'B', category: '书籍', amount: '68.00', note: '技术书' },
    { id: 4, date: '2025-09-01', group: 'A', category: '购物', amount: '120.00', note: '' },
    { id: 5, date: '2025-09-01', group: 'C', category: '股票', amount: '500.00', note: '定投' }
  ]

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <PageHeader 
          title="批量记录布局测试"
          subtitle="对比三种不同的移动端布局方案"
        />

        {/* 布局选择器 */}
        <div className="flex gap-2 mb-6 justify-center">
          <button
            onClick={() => setSelectedLayout('A')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedLayout === 'A' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            方案A: 卡片式
          </button>
          <button
            onClick={() => setSelectedLayout('B')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedLayout === 'B' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            方案B: 两行式
          </button>
          <button
            onClick={() => setSelectedLayout('C')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedLayout === 'C' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            方案C: 统一日期
          </button>
        </div>

        {/* 方案A: 卡片式布局 */}
        {selectedLayout === 'A' && (
          <div className="space-y-4">
            <ModernCard className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-lg font-bold mb-2">📱 方案A: 卡片式布局</h3>
              <p className="text-sm text-gray-600 mb-4">每条记录独立卡片，垂直排列，点击区域大</p>
            </ModernCard>

            <div className="space-y-3">
              {sampleRecords.map((record, index) => (
                <ModernCard key={record.id} className="p-4 border-2 border-gray-200 hover:border-blue-400 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-500">记录 #{index + 1}</span>
                    <span className="text-xs text-gray-400">{record.date}</span>
                  </div>
                  
                  {/* 第一行：类型和分类选择 */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button className="bg-white border-2 border-gray-300 rounded-lg p-3 text-left hover:border-blue-500 transition-all">
                      <div className="text-xs text-gray-500 mb-1">类型</div>
                      <div className="font-semibold flex items-center gap-1">
                        {record.group === 'A' && '🛒 开销'}
                        {record.group === 'B' && '📚 学习'}
                        {record.group === 'C' && '💎 储蓄'}
                      </div>
                    </button>
                    <button className="bg-white border-2 border-gray-300 rounded-lg p-3 text-left hover:border-blue-500 transition-all">
                      <div className="text-xs text-gray-500 mb-1">分类</div>
                      <div className="font-semibold">
                        {record.category}
                      </div>
                    </button>
                  </div>

                  {/* 第二行：金额输入 */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">金额</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">RM</span>
                      <input
                        type="number"
                        value={record.amount}
                        className="w-full pl-12 pr-3 py-3 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* 第三行：备注 */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">备注（可选）</label>
                    <input
                      type="text"
                      value={record.note}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="添加备注..."
                    />
                  </div>

                  {/* 状态指示器 */}
                  {record.amount && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600">记录完整</span>
                    </div>
                  )}
                </ModernCard>
              ))}
            </div>
          </div>
        )}

        {/* 方案B: 两行式布局 */}
        {selectedLayout === 'B' && (
          <div className="space-y-4">
            <ModernCard className="p-4 bg-gradient-to-r from-green-50 to-blue-50">
              <h3 className="text-lg font-bold mb-2">📱 方案B: 两行式布局</h3>
              <p className="text-sm text-gray-600 mb-4">紧凑设计，主要信息在第一行，次要信息在第二行</p>
            </ModernCard>

            <ModernCard className="p-4">
              <div className="space-y-3">
                {sampleRecords.map((record, index) => (
                  <div key={record.id} className="border-2 border-gray-200 rounded-lg p-3 hover:border-blue-400 transition-all">
                    {/* 第一行：主要信息 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 flex gap-2">
                        <select className="px-2 py-1 bg-gray-100 rounded text-sm font-semibold">
                          <option>🛒开销</option>
                          <option>📚学习</option>
                          <option>💎储蓄</option>
                        </select>
                        <select className="px-2 py-1 bg-white border rounded text-sm">
                          <option>{record.category}</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">RM</span>
                        <input
                          type="number"
                          value={record.amount}
                          className="w-20 px-2 py-1 text-right font-bold border rounded focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    {/* 第二行：次要信息 */}
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="date"
                        value={record.date}
                        className="px-2 py-1 border rounded text-xs"
                      />
                      <input
                        type="text"
                        value={record.note}
                        placeholder="备注"
                        className="flex-1 px-2 py-1 border rounded text-xs"
                      />
                      {record.amount && (
                        <span className="text-green-500">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ModernCard>
          </div>
        )}

        {/* 方案C: 统一日期式布局 */}
        {selectedLayout === 'C' && (
          <div className="space-y-4">
            <ModernCard className="p-4 bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="text-lg font-bold mb-2">📱 方案C: 统一日期式布局</h3>
              <p className="text-sm text-gray-600 mb-4">顶部统一选择日期，表格更简洁</p>
            </ModernCard>

            {/* 统一日期选择器 */}
            <ModernCard className="p-4 bg-blue-50 border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">批量记录日期</div>
                  <div className="text-lg font-bold">2025年9月1日</div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
                  更改日期
                </button>
              </div>
            </ModernCard>

            {/* 简化的记录表格 */}
            <ModernCard className="p-4">
              <div className="space-y-2">
                {/* 表头 */}
                <div className="grid grid-cols-12 gap-2 pb-2 border-b text-xs font-semibold text-gray-600">
                  <div className="col-span-3">类型</div>
                  <div className="col-span-3">分类</div>
                  <div className="col-span-3">金额</div>
                  <div className="col-span-3">备注</div>
                </div>

                {/* 记录行 */}
                {sampleRecords.map((record) => (
                  <div key={record.id} className="grid grid-cols-12 gap-2 py-2 border-b">
                    <div className="col-span-3">
                      <select className="w-full px-2 py-2 bg-gray-50 rounded text-sm">
                        <option>🛒开销</option>
                        <option>📚学习</option>
                        <option>💎储蓄</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <select className="w-full px-2 py-2 bg-white border rounded text-sm">
                        <option>{record.category}</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={record.amount}
                        className="w-full px-2 py-2 border rounded text-sm font-bold text-right"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={record.note}
                        className="w-full px-2 py-2 border rounded text-sm"
                        placeholder="备注"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 添加更多按钮 */}
              <button className="w-full mt-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all">
                + 添加更多记录
              </button>
            </ModernCard>
          </div>
        )}

        {/* 底部操作按钮 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <button className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold">
              清空
            </button>
            <button className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold">
              保存记录 (5)
            </button>
          </div>
        </div>

        {/* 占位避免被底部按钮遮挡 */}
        <div className="h-24"></div>
      </div>
    </Layout>
  )
}