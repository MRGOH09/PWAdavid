import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import { SmoothTransition } from '../components/SmoothTransition'
import WebAppWrapper from '../components/WebAppWrapper'
import BrandHeader, { PageHeader } from '../components/BrandHeader'

// 车贷计算器组件
function LoanCalculator() {
  const [loanAmount, setLoanAmount] = useState('50000')
  const [loanTermYears, setLoanTermYears] = useState('5')
  const [flatRate, setFlatRate] = useState('2.20')
  
  const [results, setResults] = useState({
    monthlyPayment: 0,
    yearlyPayment: 0,
    totalPayment: 0,
    totalInterest: 0,
    yearlyBreakdown: []
  })

  useEffect(() => {
    const principal = parseFloat(loanAmount) || 0
    const years = parseFloat(loanTermYears) || 0
    const rate = parseFloat(flatRate) / 100 || 0
    const months = years * 12

    if (principal > 0 && years > 0) {
      const totalInterest = principal * rate * years
      const totalPayment = principal + totalInterest
      const monthlyPayment = totalPayment / months
      const yearlyPayment = monthlyPayment * 12

      const yearlyBreakdown = []
      const principalPerYear = principal / years
      const interestPerYear = totalInterest / years
      
      for (let year = 1; year <= years; year++) {
        const remainingBalance = principal - (principalPerYear * (year - 1))
        const balanceAfterPayment = principal - (principalPerYear * year)
        
        yearlyBreakdown.push({
          year: year,
          startBalance: remainingBalance,
          principalPayment: principalPerYear,
          interestPayment: interestPerYear,
          totalYearlyPayment: yearlyPayment,
          endBalance: balanceAfterPayment > 0 ? balanceAfterPayment : 0
        })
      }

      setResults({
        monthlyPayment,
        yearlyPayment,
        totalPayment,
        totalInterest,
        yearlyBreakdown
      })
    }
  }, [loanAmount, loanTermYears, flatRate])

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* 输入参数卡片 */}
      <ModernCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">💰</span>
          贷款参数
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              贷款金额 (RM)
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              placeholder="50000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              贷款期限 (年)
            </label>
            <input
              type="number"
              value={loanTermYears}
              onChange={(e) => setLoanTermYears(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              placeholder="5"
              step="0.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              固定利率 (% 年利率)
            </label>
            <input
              type="number"
              value={flatRate}
              onChange={(e) => setFlatRate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              placeholder="2.20"
              step="0.01"
            />
          </div>
        </div>
      </ModernCard>

      {/* 快速总览卡片 */}
      <ModernCard variant="gradient" className="p-6 text-white">
        <h3 className="text-lg font-semibold mb-4 opacity-90 flex items-center">
          <span className="mr-2">📊</span>
          快速总览
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-xs opacity-75 mb-1">月供</div>
            <div className="text-lg font-bold break-all">
              RM {formatCurrency(results.monthlyPayment)}
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-xs opacity-75 mb-1">年供</div>
            <div className="text-lg font-bold break-all">
              RM {formatCurrency(results.yearlyPayment)}
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-xs opacity-75 mb-1">总利息</div>
            <div className="text-lg font-bold break-all">
              RM {formatCurrency(results.totalInterest)}
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-xs opacity-75 mb-1">总还款</div>
            <div className="text-lg font-bold break-all">
              RM {formatCurrency(results.totalPayment)}
            </div>
          </div>
        </div>
      </ModernCard>

      {/* 年度明细表格 */}
      <ModernCard className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
          <h3 className="text-lg font-semibold flex items-center">
            <span className="mr-2">📅</span>
            每年还款明细
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">年份</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">年初欠款</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">本金</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">利息</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">年供</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">年末欠款</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.yearlyBreakdown.map((year, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900">
                    第{year.year}年
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-gray-700">
                    {formatCurrency(year.startBalance)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-green-600 font-medium">
                    {formatCurrency(year.principalPayment)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-red-600 font-medium">
                    {formatCurrency(year.interestPayment)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-blue-600 font-bold">
                    {formatCurrency(year.totalYearlyPayment)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-medium">
                    {year.endBalance > 0 ? (
                      <span className="text-gray-900">{formatCurrency(year.endBalance)}</span>
                    ) : (
                      <span className="text-green-600 font-bold">已还清</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ModernCard>

      {/* 快捷输入按钮 */}
      <ModernCard className="p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">快捷输入</h4>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-600 mb-2">常见贷款金额</p>
            <div className="flex flex-wrap gap-2">
              {['30000', '50000', '80000', '100000', '150000'].map(amount => (
                <button
                  key={amount}
                  onClick={() => setLoanAmount(amount)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    loanAmount === amount 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {parseInt(amount) >= 1000 ? `${parseInt(amount)/1000}k` : amount}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-600 mb-2">贷款期限</p>
            <div className="flex flex-wrap gap-2">
              {['3', '5', '7', '9'].map(years => (
                <button
                  key={years}
                  onClick={() => setLoanTermYears(years)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    loanTermYears === years 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {years}年
                </button>
              ))}
            </div>
          </div>
        </div>
      </ModernCard>
    </div>
  )
}

// EPF计算器组件
function EPFCalculator() {
  const [formData, setFormData] = useState({
    currentAge: 17,
    startingSalary: 1700,
    salaryIncreaseRate: 3,
    epfReturn: 5.8
  })

  const [results, setResults] = useState(null)
  const [chartData, setChartData] = useState([])

  const EPF_CONTRIBUTION_RATE = 0.23
  const RETIREMENT_AGE = 55
  const FINAL_AGE = 90

  const calculateEPF = () => {
    const { currentAge, startingSalary, salaryIncreaseRate, epfReturn } = formData
    const salaryGrowthRate = salaryIncreaseRate / 100
    const returnRate = epfReturn / 100
    
    let totalBalance = 0
    let totalContributions = 0
    const yearlyData = []

    // 工作期间 (到55岁)
    for (let age = currentAge; age <= FINAL_AGE; age++) {
      if (age <= RETIREMENT_AGE) {
        // 55岁前：有工资和贡献
        const yearsWorked = age - currentAge
        const currentSalary = startingSalary * Math.pow(1 + salaryGrowthRate, yearsWorked)
        const yearlyContribution = currentSalary * 12 * EPF_CONTRIBUTION_RATE
        
        totalContributions += yearlyContribution
        totalBalance = (totalBalance + yearlyContribution / 2) * (1 + returnRate) + yearlyContribution / 2
      } else {
        // 55岁后：只有利息增长，没有新贡献
        totalBalance = totalBalance * (1 + returnRate)
      }
      
      const interest = totalBalance - totalContributions
      const currentSalary = age <= RETIREMENT_AGE 
        ? startingSalary * Math.pow(1 + salaryGrowthRate, age - currentAge)
        : 0
      
      yearlyData.push({
        age,
        年龄: age,
        总金额: Math.round(totalBalance),
        本金贡献: Math.round(totalContributions),
        利息收益: Math.round(interest),
        月薪: Math.round(currentSalary),
        年贡献: age <= RETIREMENT_AGE ? Math.round(currentSalary * 12 * EPF_CONTRIBUTION_RATE) : 0,
        阶段: age <= RETIREMENT_AGE ? '工作期' : '退休期'
      })
    }

    setResults({
      finalBalance: totalBalance,
      totalContributions,
      totalInterest: totalBalance - totalContributions,
      yearsToRetirement: RETIREMENT_AGE - currentAge,
      balanceAt55: yearlyData.find(d => d.年龄 === RETIREMENT_AGE)?.总金额 || 0,
      balanceAt90: totalBalance
    })

    setChartData(yearlyData)
  }

  useEffect(() => {
    calculateEPF()
  }, [formData])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* 输入参数 */}
      <ModernCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🏦</span>
          EPF参数设置
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前年龄
            </label>
            <input
              type="number"
              value={formData.currentAge}
              onChange={(e) => handleInputChange('currentAge', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="16"
              max="54"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              起薪 (RM/月)
            </label>
            <input
              type="number"
              value={formData.startingSalary}
              onChange={(e) => handleInputChange('startingSalary', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年薪增长率 (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.salaryIncreaseRate}
              onChange={(e) => handleInputChange('salaryIncreaseRate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              EPF年回报率 (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.epfReturn}
              onChange={(e) => handleInputChange('epfReturn', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 bg-blue-50 p-4 rounded-xl">
          <h4 className="font-semibold text-blue-800 mb-2">💡 EPF贡献说明</h4>
          <p className="text-sm text-blue-700">
            • 员工贡献：11% | 雇主贡献：12% | 总贡献率：23%<br/>
            • 55岁退休后不再有新贡献，但余额继续产生利息至90岁
          </p>
        </div>
      </ModernCard>

      {/* 结果显示 */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModernCard variant="gradient" className="p-6 text-white">
            <h3 className="text-lg font-semibold mb-4 opacity-90">
              🎯 55岁退休时
            </h3>
            <div className="text-3xl font-bold mb-2">{formatCurrency(results.balanceAt55)}</div>
            <p className="text-sm opacity-75">工作年限：{results.yearsToRetirement}年</p>
          </ModernCard>

          <ModernCard className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <h3 className="text-lg font-semibold mb-4 opacity-90">
              💰 90岁时总额
            </h3>
            <div className="text-3xl font-bold mb-2">{formatCurrency(results.balanceAt90)}</div>
            <p className="text-sm opacity-75">纯利息增长35年</p>
          </ModernCard>
        </div>
      )}

      {/* 累积趋势图表 */}
      {chartData.length > 0 && (
        <ModernCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 EPF累积趋势 (至90岁)
          </h3>
          
          <div className="overflow-x-auto">
            <div className="min-w-[600px] h-64 flex items-end space-x-1">
              {chartData.filter((_, i) => i % 2 === 0).map((data, index) => {
                const height = (data.总金额 / chartData[chartData.length - 1].总金额) * 100
                const isRetired = data.年龄 > RETIREMENT_AGE
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center">
                      <div 
                        className={`w-full rounded-t transition-all duration-500 ${
                          isRetired ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-blue-500 to-blue-400'
                        }`}
                        style={{ height: `${height * 2}px` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {data.年龄}
                      {data.年龄 === RETIREMENT_AGE && '🎯'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
              <span className="text-gray-600">工作期 (贡献+利息)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-600">退休期 (纯利息)</span>
            </div>
          </div>
        </ModernCard>
      )}

      {/* 年度明细表格 */}
      {chartData.length > 0 && (
        <ModernCard className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
            <h3 className="text-lg font-semibold flex items-center">
              <span className="mr-2">📊</span>
              EPF年度明细 (17-90岁)
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">年龄</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">月薪 (RM)</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">年贡献 (RM)</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">总金额 (RM)</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">被动收入*</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700">阶段</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chartData.filter((_, index) => index % 3 === 0 || chartData[index].年龄 === 55 || chartData[index].年龄 === 90).map((data, index) => {
                  const passiveIncome = data.总金额 * (formData.epfReturn / 100) / 12 // 月被动收入
                  const isRetirement = data.年龄 === 55
                  const isFinal = data.年龄 === 90
                  
                  return (
                    <tr 
                      key={index} 
                      className={`
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        ${isRetirement ? 'bg-yellow-50 border-yellow-200' : ''}
                        ${isFinal ? 'bg-green-50 border-green-200' : ''}
                      `}
                    >
                      <td className="px-3 py-3 text-sm font-medium">
                        {data.年龄}岁
                        {isRetirement && <span className="ml-1 text-yellow-600">🎯</span>}
                        {isFinal && <span className="ml-1 text-green-600">💰</span>}
                      </td>
                      <td className="px-3 py-3 text-sm text-right">
                        {data.月薪 > 0 ? formatCurrency(data.月薪).replace('RM', '') : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-right text-blue-600">
                        {data.年贡献 > 0 ? formatCurrency(data.年贡献).replace('RM', '') : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-right font-medium text-green-600">
                        {formatCurrency(data.总金额).replace('RM', '')}
                      </td>
                      <td className="px-3 py-3 text-sm text-right">
                        {data.年龄 >= 55 ? (
                          <span className="text-emerald-600 font-semibold">
                            RM{Math.round(passiveIncome).toLocaleString()}/月
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          data.阶段 === '工作期' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {data.阶段}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 border-t">
            <p className="text-xs text-gray-600">
              * 被动收入按EPF年回报率计算的月收入估算 (仅供参考)
            </p>
          </div>
        </ModernCard>
      )}

      {/* 快捷输入 */}
      <ModernCard className="p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">快捷输入</h4>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-600 mb-2">常见起薪</p>
            <div className="flex flex-wrap gap-2">
              {['1500', '1700', '2000', '2500', '3000'].map(salary => (
                <button
                  key={salary}
                  onClick={() => setFormData(prev => ({ ...prev, startingSalary: parseFloat(salary) }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    formData.startingSalary === parseFloat(salary) 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  RM{salary}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-600 mb-2">EPF年回报率</p>
            <div className="flex flex-wrap gap-2">
              {['5.0', '5.5', '5.8', '6.0', '6.5'].map(rate => (
                <button
                  key={rate}
                  onClick={() => setFormData(prev => ({ ...prev, epfReturn: parseFloat(rate) }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    formData.epfReturn === parseFloat(rate) 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </ModernCard>
    </div>
  )
}

// 投资对比模拟器组件 - 原装版本适配PWA
function InvestmentComparator() {
  const [investmentAmount, setInvestmentAmount] = useState(1000)
  const [frequency, setFrequency] = useState('monthly')
  const [duration, setDuration] = useState(10)
  const [results, setResults] = useState(null)

  // 资产数据 - 原装数据
  const assets = {
    gold: {
      name: '黄金 (Gold)',
      annualReturn: 0.08,
      dividendYield: 0,
      color: '#FFD700',
      type: 'stock'
    },
    maybank: {
      name: 'Maybank',
      annualReturn: 0.07,
      dividendYield: 0.06,
      color: '#FF6B35',
      type: 'stock'
    },
    publicbank: {
      name: 'Public Bank',
      annualReturn: 0.06,
      dividendYield: 0.05,
      color: '#4ECDC4',
      type: 'stock'
    },
    ocbc: {
      name: 'OCBC Bank',
      annualReturn: 0.065,
      dividendYield: 0.045,
      color: '#45B7D1',
      type: 'stock'
    },
    bursa: {
      name: 'Bursa Malaysia',
      annualReturn: 0.06,
      dividendYield: 0.05,
      color: '#E74C3C',
      type: 'stock'
    },
    sgx: {
      name: 'Singapore Exchange (SGX)',
      annualReturn: 0.055,
      dividendYield: 0.025,
      color: '#9B59B6',
      type: 'stock'
    },
    boc: {
      name: '中国银行 (Bank of China)',
      annualReturn: 0.05,
      dividendYield: 0.06,
      color: '#3498DB',
      type: 'stock'
    },
    hkex: {
      name: '香港交易所 (HKEX)',
      annualReturn: 0.08,
      dividendYield: 0.024,
      color: '#F39C12',
      type: 'stock'
    },
    realestate_rental: {
      name: '房地产出租',
      propertyGrowth: 0.035,
      rentalYield: 0.04,
      mortgageRate: 0.05,
      downPaymentRatio: 0.20,
      color: '#8B4513',
      type: 'realestate'
    },
    realestate_selfuse: {
      name: '房地产自住',
      propertyGrowth: 0.035,
      rentalYield: 0,
      mortgageRate: 0.05,
      downPaymentRatio: 0.20,
      color: '#A0522D',
      type: 'realestate'
    }
  }

  const frequencies = {
    weekly: { name: '每周', periodsPerYear: 52 },
    biweekly: { name: '双周', periodsPerYear: 26 },
    monthly: { name: '每月', periodsPerYear: 12 },
    quarterly: { name: '每季', periodsPerYear: 4 },
    annually: { name: '每年', periodsPerYear: 1 }
  }

  // 计算股票投资 - 原装算法
  const calculateStockInvestment = (asset, investmentAmount, frequency, duration) => {
    const periodsPerYear = frequencies[frequency].periodsPerYear
    const totalPeriods = duration * periodsPerYear
    const totalInvested = investmentAmount * totalPeriods
    
    const totalAnnualReturn = asset.annualReturn + asset.dividendYield
    const periodReturn = totalAnnualReturn / periodsPerYear
    
    let totalValue = 0
    let dividendIncome = 0
    
    for (let period = 1; period <= totalPeriods; period++) {
      totalValue = totalValue * (1 + periodReturn) + investmentAmount
      const periodDividend = (totalValue - investmentAmount) * (asset.dividendYield / periodsPerYear)
      dividendIncome += periodDividend
    }
    
    const capitalGains = totalValue - totalInvested - dividendIncome
    const totalReturn = totalValue - totalInvested
    const returnPercentage = (totalReturn / totalInvested) * 100
    const annualizedReturn = (Math.pow(totalValue / totalInvested, 1 / duration) - 1) * 100
    
    return {
      name: asset.name,
      finalValue: totalValue,
      totalInvested: totalInvested,
      totalReturn: totalReturn,
      returnPercentage: returnPercentage,
      annualizedReturn: annualizedReturn,
      capitalGains: capitalGains,
      dividendIncome: dividendIncome,
      color: asset.color,
      type: 'stock',
      annualReturn: asset.annualReturn,
      dividendYield: asset.dividendYield
    }
  }

  // 计算房地产投资 - 原装算法
  const calculateRealEstateInvestment = (asset, monthlyPayment, duration) => {
    const loanMonths = duration * 12
    const annualRate = asset.mortgageRate
    const monthlyRate = annualRate / 12
    
    // 根据月供计算贷款本金
    const factor = Math.pow(1 + monthlyRate, loanMonths)
    const loanPrincipal = monthlyPayment * (factor - 1) / (monthlyRate * factor)
    
    // 计算房屋总价和首付
    const housePrice = loanPrincipal / (1 - asset.downPaymentRatio)
    const downPayment = housePrice * asset.downPaymentRatio
    
    // 等额本息还款计算
    let remainingBalance = loanPrincipal
    let totalInterestPaid = 0
    let totalRentalIncome = 0
    
    for (let year = 1; year <= duration; year++) {
      // 计算该年的12个月还款
      for (let month = 1; month <= 12; month++) {
        const monthlyInterest = remainingBalance * monthlyRate
        const monthlyPrincipal = monthlyPayment - monthlyInterest
        remainingBalance -= monthlyPrincipal
        totalInterestPaid += monthlyInterest
      }
      remainingBalance = Math.max(0, remainingBalance)
      
      // 计算该年底的房产价值
      const currentHouseValue = housePrice * Math.pow(1 + asset.propertyGrowth, year)
      
      // 计算该年的租金收入
      if (asset.rentalYield > 0) {
        const yearlyRentalIncome = currentHouseValue * asset.rentalYield
        totalRentalIncome += yearlyRentalIncome
      }
    }
    
    // 最终房产价值
    const finalHouseValue = housePrice * Math.pow(1 + asset.propertyGrowth, duration)
    
    // 净资产 = 房产价值 - 剩余贷款
    const netWorth = finalHouseValue - remainingBalance
    
    // 总资产价值 = 净资产 + 累计租金收入
    const totalAssetValue = netWorth + totalRentalIncome
    
    // 总投资 = 首付 + 月供总额
    const totalMonthlyPayments = monthlyPayment * loanMonths
    const totalInvested = downPayment + totalMonthlyPayments
    
    const totalReturn = totalAssetValue - totalInvested
    const returnPercentage = (totalReturn / totalInvested) * 100
    const annualizedReturn = (Math.pow(totalAssetValue / totalInvested, 1 / duration) - 1) * 100
    
    return {
      name: asset.name,
      finalValue: totalAssetValue,
      totalInvested: totalInvested,
      totalReturn: totalReturn,
      returnPercentage: returnPercentage,
      annualizedReturn: annualizedReturn,
      capitalGains: netWorth - downPayment,
      dividendIncome: totalRentalIncome,
      color: asset.color,
      type: 'realestate',
      housePrice: housePrice,
      downPayment: downPayment,
      finalHouseValue: finalHouseValue,
      netWorth: netWorth,
      totalRentalIncome: totalRentalIncome,
      netCashFlow: totalRentalIncome - totalMonthlyPayments,
      leverageRatio: housePrice / downPayment,
      leverageGain: (finalHouseValue - housePrice) / downPayment,
      propertyGrowth: asset.propertyGrowth,
      rentalYield: asset.rentalYield,
      mortgageRate: asset.mortgageRate
    }
  }

  // 计算所有投资 - 原装算法
  const calculateAllInvestments = () => {
    const periodsPerYear = frequencies[frequency].periodsPerYear
    const totalPeriods = duration * periodsPerYear
    const stockTotalInvested = investmentAmount * totalPeriods
    const inflationRate = 0.02
    
    const allResults = {}
    
    // 现金选项
    allResults.cash = {
      name: '现金存放',
      finalValue: stockTotalInvested,
      totalInvested: stockTotalInvested,
      totalReturn: 0,
      returnPercentage: 0,
      color: '#6B7280',
      type: 'cash'
    }
    
    allResults.cashInflation = {
      name: '现金购买力 (通胀2%)',
      finalValue: stockTotalInvested / Math.pow(1 + inflationRate, duration),
      totalInvested: stockTotalInvested,
      totalReturn: (stockTotalInvested / Math.pow(1 + inflationRate, duration)) - stockTotalInvested,
      returnPercentage: ((stockTotalInvested / Math.pow(1 + inflationRate, duration) - stockTotalInvested) / stockTotalInvested * 100),
      color: '#EF4444',
      type: 'cash'
    }
    
    // 计算所有资产
    Object.entries(assets).forEach(([key, asset]) => {
      if (asset.type === 'stock') {
        allResults[key] = calculateStockInvestment(asset, investmentAmount, frequency, duration)
      } else if (asset.type === 'realestate') {
        allResults[key] = calculateRealEstateInvestment(asset, investmentAmount, duration)
      }
    })
    
    setResults({
      stockTotalInvested,
      allAssets: allResults,
      inflationRate
    })
  }

  useEffect(() => {
    calculateAllInvestments()
  }, [investmentAmount, frequency, duration])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* 投资参数设置 */}
      <ModernCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🧮</span>
          投资参数设置
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              每次投资金额 (RM)
            </label>
            <input
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(Number(e.target.value))}
              min="100"
              step="100"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              投资频率
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(frequencies).map(([key, freq]) => (
                <option key={key} value={key}>
                  {freq.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              投资时长 (年)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 5, 10, 20, 30].map(year => (
                <button
                  key={year}
                  onClick={() => setDuration(year)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    duration === year
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {year}年
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 投资总结 */}
        {results && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-3 text-sm">📊 投资总结</h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
              <div>
                <p>• 每{frequencies[frequency].name.slice(1)}: {formatCurrency(investmentAmount)}</p>
                <p>• 期限: {duration}年</p>
                <p>• 投资次数: {duration * frequencies[frequency].periodsPerYear}次</p>
              </div>
              <div>
                <p>• 股票总投资: {formatCurrency(results.stockTotalInvested)}</p>
                {(() => {
                  const realEstate = Object.values(results.allAssets).find(asset => asset.type === 'realestate')
                  return realEstate ? (
                    <p>• 房地产总投资: {formatCurrency(realEstate.totalInvested)}</p>
                  ) : null
                })()}
              </div>
            </div>
          </div>
        )}
      </ModernCard>

      {/* 投资对比结果 */}
      {results && (
        <div className="space-y-4">
          <ModernCard className="overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
              <h3 className="text-lg font-semibold flex items-center">
                <span className="mr-2">📊</span>
                投资对比结果 (按最终价值排序)
              </h3>
            </div>
            
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(results.allAssets)
                .sort((a, b) => b[1].finalValue - a[1].finalValue)
                .map(([key, result], index) => {
                  const isTop3 = index < 3
                  const isCash = result.type === 'cash'
                  const isRealEstate = result.type === 'realestate'
                  const isWinner = index === 0 && !isCash
                  
                  return (
                    <div 
                      key={key}
                      className={`flex items-center justify-between p-4 rounded-xl border-l-4 transition-all hover:translate-x-1 ${
                        isCash ? 'bg-red-50 border-red-500' : 
                        isWinner ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-500 ring-2 ring-yellow-300' :
                        isTop3 ? 'bg-green-50 border-green-500' : 
                        'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: result.color }}
                        ></div>
                        <div>
                          <div className={`font-semibold text-sm ${
                            isCash ? 'text-red-800' :
                            isWinner ? 'text-yellow-800' :
                            isTop3 ? 'text-green-800' :
                            'text-gray-800'
                          }`}>
                            {result.name}
                            {isWinner && <span className="ml-2 text-yellow-600">👑</span>}
                            {isRealEstate && <span className="ml-2">🏠</span>}
                          </div>
                          {isRealEstate && (
                            <div className="text-xs text-gray-600 mt-1">
                              净资产: {formatCurrency(result.netWorth).replace('RM', '')}
                              {result.totalRentalIncome > 0 && (
                                <span> + 租金: {formatCurrency(result.totalRentalIncome).replace('RM', '')}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          isCash ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(result.finalValue)}
                        </div>
                        <div className={`text-sm ${
                          result.returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {result.returnPercentage >= 0 ? '+' : ''}{result.returnPercentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </ModernCard>

          {/* 最佳投资详情 */}
          {(() => {
            const bestAsset = Object.entries(results.allAssets)
              .filter(([key]) => key !== 'cash' && key !== 'cashInflation')
              .sort((a, b) => b[1].finalValue - a[1].finalValue)[0]
            
            if (!bestAsset) return null
            
            const [key, result] = bestAsset
            const isRealEstate = result.type === 'realestate'
            
            return (
              <ModernCard className="p-6 border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
                <h3 className="text-lg font-semibold mb-4 text-yellow-800 flex items-center">
                  <span className="mr-2">🥇</span>
                  最佳投资选择
                </h3>
                <div className="space-y-3">
                  <p className="font-medium text-gray-800">{result.name}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">最终价值:</span>
                      <span className="ml-2 font-semibold text-green-600">{formatCurrency(result.finalValue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">总投资:</span>
                      <span className="ml-2 font-semibold">{formatCurrency(result.totalInvested)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">总收益:</span>
                      <span className="ml-2 font-semibold text-green-600">+{formatCurrency(result.totalReturn)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">年化回报:</span>
                      <span className="ml-2 font-semibold">{result.annualizedReturn?.toFixed(1)}%</span>
                    </div>
                    {isRealEstate && (
                      <>
                        <div>
                          <span className="text-gray-600">房屋总价:</span>
                          <span className="ml-2 font-semibold">{formatCurrency(result.housePrice)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">杠杆收益:</span>
                          <span className="ml-2 font-semibold text-orange-600">{result.leverageGain?.toFixed(1)}倍</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </ModernCard>
            )
          })()}
        </div>
      )}

      {/* 免责声明 */}
      <ModernCard className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start space-x-2">
          <span className="text-amber-600 text-lg">⚠️</span>
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-2">重要提醒</p>
            <p className="mb-2">此模拟器基于真实搜索结果，使用原装算法。房地产计算基于等额本息房贷模式，总资产价值 = 净资产 + 累计租金收入。</p>
            <p className="mb-2">• 房地产出租: 3.5%年增值 + 4%年租金收益，基于20%首付，5%房贷利率</p>
            <p>• 实际投资回报会因市场波动、经济环境等多种因素而有所不同。投资前请咨询专业理财顾问。</p>
          </div>
        </div>
      </ModernCard>
    </div>
  )
}

// 薪资增长计算器组件
function SalaryGrowthCalculator() {
  const [formData, setFormData] = useState({
    startAge: 18,
    endAge: 55,
    initialSalary: 1700,
    learningRate: 33,
    conversionRate: 1.0
  })

  const [results, setResults] = useState(null)
  const [timeline, setTimeline] = useState([])

  const calculateSalaryGrowth = () => {
    const { startAge, endAge, initialSalary, learningRate, conversionRate } = formData
    
    // 验证输入
    if (endAge <= startAge) {
      alert('目标年龄必须大于起始年龄！')
      return
    }

    // 计算参数
    const monthlyGrowthRate = (learningRate / 100) * (conversionRate / 100)
    const totalMonths = (endAge - startAge) * 12
    
    // 逐月计算
    let currentSalary = initialSalary
    let totalLearningInvestment = 0
    const timelineData = []

    // 添加起始点
    timelineData.push({
      age: startAge,
      salary: initialSalary,
      isStart: true
    })

    // 逐月计算薪资增长
    for (let month = 1; month <= totalMonths; month++) {
      const learningInvestment = currentSalary * (learningRate / 100)
      totalLearningInvestment += learningInvestment
      
      const salaryIncrease = learningInvestment * (conversionRate / 100)
      currentSalary += salaryIncrease
      
      // 每5年记录一次 + 最后一个月
      if (month % 60 === 0 || month === totalMonths) {
        const currentAge = startAge + Math.floor(month / 12)
        timelineData.push({
          age: currentAge,
          salary: currentSalary,
          isFinal: month === totalMonths
        })
      }
    }

    // 计算最终结果
    const finalSalary = currentSalary
    const growthMultiple = finalSalary / initialSalary
    const annualGrowthRate = (Math.pow(1 + monthlyGrowthRate, 12) - 1) * 100

    setResults({
      finalSalary,
      growthMultiple,
      totalInvestment: totalLearningInvestment,
      annualRate: annualGrowthRate,
      monthlyRate: monthlyGrowthRate * 100
    })

    setTimeline(timelineData)
  }

  useEffect(() => {
    calculateSalaryGrowth()
  }, [formData])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const monthlyGrowthRate = (formData.learningRate / 100) * (formData.conversionRate / 100)

  return (
    <div className="space-y-6">
      {/* 参数设置 */}
      <ModernCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          薪资增长参数设置
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              起始年龄
            </label>
            <input
              type="number"
              value={formData.startAge}
              onChange={(e) => handleInputChange('startAge', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="16"
              max="65"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标年龄
            </label>
            <input
              type="number"
              value={formData.endAge}
              onChange={(e) => handleInputChange('endAge', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="20"
              max="80"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              初始月薪 (RM)
            </label>
            <input
              type="number"
              value={formData.initialSalary}
              onChange={(e) => handleInputChange('initialSalary', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1000"
              step="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学习投入比例 (%)
            </label>
            <input
              type="number"
              value={formData.learningRate}
              onChange={(e) => handleInputChange('learningRate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="90"
              step="1"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学习转化为加薪比例 (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.conversionRate}
              onChange={(e) => handleInputChange('conversionRate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0.1"
              max="10"
            />
          </div>
        </div>

        {/* 公式显示 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="text-center">
            <span className="font-semibold text-yellow-800">月增长率:</span>
            <span className="ml-2 text-lg font-bold text-yellow-900">
              {(monthlyGrowthRate * 100).toFixed(3)}%
            </span>
          </div>
          <div className="text-xs text-yellow-700 mt-2 text-center">
            计算公式: 学习投入比例 × 转化比例 = {formData.learningRate}% × {formData.conversionRate}%
          </div>
        </div>
      </ModernCard>

      {/* 核心结果 */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ModernCard variant="gradient" className="p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">
              💰 最终月薪
            </h3>
            <div className="text-2xl font-bold mb-2">{formatCurrency(results.finalSalary)}</div>
            <p className="text-sm opacity-75">{formData.endAge}岁时的月收入</p>
          </ModernCard>

          <ModernCard className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">
              📈 增长倍数
            </h3>
            <div className="text-2xl font-bold mb-2">{results.growthMultiple.toFixed(2)}倍</div>
            <p className="text-sm opacity-75">相对于初始薪资</p>
          </ModernCard>

          <ModernCard className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">
              💡 总学习投资
            </h3>
            <div className="text-2xl font-bold mb-2">{formatCurrency(results.totalInvestment)}</div>
            <p className="text-sm opacity-75">累计学习支出</p>
          </ModernCard>

          <ModernCard className="p-6 bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">
              🚀 年化增长率
            </h3>
            <div className="text-2xl font-bold mb-2">{results.annualRate.toFixed(2)}%</div>
            <p className="text-sm opacity-75">等效年复合增长率</p>
          </ModernCard>
        </div>
      )}

      {/* 薪资轨迹时间线 */}
      {timeline.length > 0 && (
        <ModernCard className="overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
            <h3 className="text-lg font-semibold flex items-center">
              <span className="mr-2">📋</span>
              薪资增长轨迹 ({formData.startAge}-{formData.endAge}岁)
            </h3>
          </div>
          
          <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
            {timeline.map((item, index) => {
              const isStart = item.isStart
              const isFinal = item.isFinal
              const isMiddle = !isStart && !isFinal
              
              return (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-4 rounded-xl border-l-4 transition-all hover:translate-x-1 ${
                    isStart ? 'bg-blue-50 border-blue-500' :
                    isFinal ? 'bg-green-50 border-green-500' :
                    'bg-gray-50 border-indigo-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`text-2xl ${
                      isStart ? '🎯' : isFinal ? '👑' : '📊'
                    }`}></span>
                    <div>
                      <div className={`font-semibold ${
                        isStart ? 'text-blue-800' :
                        isFinal ? 'text-green-800' :
                        'text-gray-800'
                      }`}>
                        {item.age}岁
                        {isStart && ' (起始)'}
                        {isFinal && ' (目标)'}
                      </div>
                      {isMiddle && (
                        <div className="text-sm text-gray-600">
                          第{item.age - formData.startAge}年
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`text-right ${
                    isStart ? 'text-blue-600' :
                    isFinal ? 'text-green-600' :
                    'text-indigo-600'
                  }`}>
                    <div className="text-xl font-bold">
                      {formatCurrency(item.salary)}
                    </div>
                    {!isStart && (
                      <div className="text-sm opacity-75">
                        +{(((item.salary / formData.initialSalary) - 1) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ModernCard>
      )}

      {/* 快捷输入 */}
      <ModernCard className="p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">快捷输入</h4>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-600 mb-2">常见起薪</p>
            <div className="flex flex-wrap gap-2">
              {['1500', '1700', '2000', '2500', '3000', '3500'].map(salary => (
                <button
                  key={salary}
                  onClick={() => setFormData(prev => ({ ...prev, initialSalary: parseFloat(salary) }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    formData.initialSalary === parseFloat(salary) 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  RM{salary}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-600 mb-2">学习投入比例</p>
            <div className="flex flex-wrap gap-2">
              {['20', '25', '30', '33', '40', '50'].map(rate => (
                <button
                  key={rate}
                  onClick={() => setFormData(prev => ({ ...prev, learningRate: parseFloat(rate) }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    formData.learningRate === parseFloat(rate) 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-600 mb-2">转化比例</p>
            <div className="flex flex-wrap gap-2">
              {['0.5', '0.8', '1.0', '1.2', '1.5', '2.0'].map(rate => (
                <button
                  key={rate}
                  onClick={() => setFormData(prev => ({ ...prev, conversionRate: parseFloat(rate) }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    formData.conversionRate === parseFloat(rate) 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </ModernCard>

      {/* 说明文档 */}
      <ModernCard className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 text-lg">💡</span>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">薪资增长原理</p>
            <p className="mb-2">• <strong>学习投入</strong>：每月将一定比例薪资投入学习提升</p>
            <p className="mb-2">• <strong>转化效果</strong>：学习投入按比例转化为下月薪资增长</p>
            <p className="mb-2">• <strong>复利效应</strong>：薪资增长后，学习投入金额也随之增加</p>
            <p>• <strong>长期影响</strong>：持续学习投入将产生显著的复合增长效果</p>
          </div>
        </div>
      </ModernCard>
    </div>
  )
}

// 主计算器页面
export default function CalculatorPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('loan')

  const tabs = [
    { id: 'loan', name: '车贷计算', icon: '🚗', color: 'blue' },
    { id: 'epf', name: 'EPF模拟', icon: '🏦', color: 'green' },
    { id: 'investment', name: '投资对比', icon: '📈', color: 'purple' },
    { id: 'salary', name: '薪资增长', icon: '💰', color: 'orange' }
  ]

  return (
    <WebAppWrapper>
      <Layout title="财务计算器 - Learner Club">
        <BrandHeader />
        
        <SmoothTransition>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* 页面头部 */}
            <PageHeader 
              title={
                <div className="flex items-center space-x-2">
                  <span>🧮</span>
                  <span>财务计算器</span>
                </div>
              }
              subtitle="专业的财务规划工具集"
              onBack={() => router.back()}
            />
            
            <div className="px-4 pb-8 -mt-12 space-y-6">
              
              {/* 标签页选择器 - 放在顶部 */}
              <ModernCard className="p-2 relative z-20">
                <div className="flex space-x-2">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    const activeClasses = {
                      'loan': 'bg-gradient-to-r from-blue-500 to-blue-600',
                      'epf': 'bg-gradient-to-r from-green-500 to-green-600',
                      'investment': 'bg-gradient-to-r from-purple-500 to-purple-600',
                      'salary': 'bg-gradient-to-r from-orange-500 to-orange-600'
                    }
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={`
                          flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg
                          font-medium transition-all duration-200
                          ${isActive 
                            ? `${activeClasses[tab.id]} text-white shadow-lg transform scale-105` 
                            : tab.disabled 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'
                          }
                        `}
                      >
                        <span className="text-lg">{tab.icon}</span>
                        <span className="text-sm">{tab.name}</span>
                        {tab.disabled && (
                          <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full ml-1">
                            即将推出
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </ModernCard>

              {/* 标签内容 */}
              <div className="transition-all duration-300">
                {activeTab === 'loan' && <LoanCalculator />}
                {activeTab === 'epf' && <EPFCalculator />}
                {activeTab === 'investment' && <InvestmentComparator />}
                {activeTab === 'salary' && <SalaryGrowthCalculator />}
              </div>

              {/* 底部说明 */}
              <ModernCard className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">免责声明</p>
                    <p>此计算器仅供参考，实际结果可能因政策、利率等因素有所不同。请咨询专业财务顾问获取准确建议。</p>
                  </div>
                </div>
              </ModernCard>
            </div>
          </div>
        </SmoothTransition>
      </Layout>
    </WebAppWrapper>
  )
}