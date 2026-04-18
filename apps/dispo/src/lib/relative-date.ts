export function formatRelativeDate(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'heute'
  if (diffDays === 1) return 'gestern'
  if (diffDays < 7) return `vor ${diffDays} Tagen`
  if (diffDays < 14) return 'vor einer Woche'
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `vor ${weeks} Wochen`
  }
  if (diffDays < 60) return 'vor einem Monat'
  const months = Math.floor(diffDays / 30)
  return `vor ${months} Monaten`
}
