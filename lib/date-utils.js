// 日期处理工具（PWA-Google 独立版）

export function getLocalYMD(date = new Date()) {
  const malaysiaOffset = 8 * 60 * 60 * 1000
  const malaysiaTime = new Date(date.getTime() + malaysiaOffset)
  return malaysiaTime.toISOString().slice(0, 10)
}

export function getMonthRange(month) {
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const year = parseInt(month.split('-')[0])
  const monthNum = parseInt(month.split('-')[1])

  const startDate = `${month}-01`
  let endDate
  if (month === currentMonth) {
    endDate = today.toISOString().slice(0, 10)
  } else {
    const lastDay = new Date(year, monthNum, 0).getDate()
    endDate = `${month}-${lastDay.toString().padStart(2, '0')}`
  }
  return { startDate, endDate }
}

export function isValidYMD(ymd) {
  if (!ymd || typeof ymd !== 'string') return false
  const pattern = /^\d{4}-\d{2}-\d{2}$/
  if (!pattern.test(ymd)) return false
  const date = new Date(ymd + 'T00:00:00.000Z')
  return date.toISOString().slice(0, 10) === ymd
}

export function formatDisplayDate(ymd) {
  if (!isValidYMD(ymd)) return ymd || 'Invalid Date'
  const date = new Date(ymd + 'T00:00:00.000Z')
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays === 1) return '今天'
  if (diffDays === 2) return '昨天'
  if (diffDays <= 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function utcToLocalYMD(isoString) {
  if (!isoString) return getLocalYMD()
  const date = new Date(isoString)
  return getLocalYMD(date)
}

export default {
  getLocalYMD,
  getMonthRange,
  isValidYMD,
  formatDisplayDate,
  utcToLocalYMD
}

