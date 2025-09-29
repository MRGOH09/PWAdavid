// Unified branch list and helpers
export const BRANCHES = [
  'Austin',
  'Banting',
  'Batu Gajah',
  'Bentong',
  'Bercham',
  'Desa Petaling',
  'Cheras Perdana',
  'Equine Park',
  'Farlim',
  'Kapar',
  'Kulai',
  'Labis Mines',
  'Mantin Utama',
  'Metro Prima',
  'Permas Jaya',
  'Raja Uda',
  'Rawang',
  'Senai',
  'Seremban',
  'Taiping',
  'Taman Midah',
  '大洋园',
  '小天使'
]

export const BRANCH_MAP = Object.fromEntries(BRANCHES.map(b => [b, b]))

const PALETTE = ['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#06B6D4','#84CC16','#EC4899','#0EA5E9','#F97316']

export function branchConfigFor(code, index) {
  return {
    name: code,
    color: PALETTE[index % PALETTE.length],
    icon: '🏢'
  }
}
