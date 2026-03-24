export function today(): string {
  const d = new Date()
  return toYMD(d)
}

export function getWeekStart(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toYMD(d)
}

export function getDaysInRange(start: string, end: string): string[] {
  const result: string[] = []
  const current = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (current <= last) {
    result.push(toYMD(current))
    current.setDate(current.getDate() + 1)
  }
  return result
}

export function formatDeadline(isoString: string): string {
  const d = new Date(isoString + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
