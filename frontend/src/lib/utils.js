import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes = 0, decimals = 1) {
  if (!bytes) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : decimals))} ${units[i]}`
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
export function timeAgo(date) {
  const d = new Date(date)
  const diff = (d.getTime() - Date.now()) / 1000
  const table = [
    [60, 'second'],
    [3600, 'minute', 60],
    [86400, 'hour', 3600],
    [604800, 'day', 86400],
    [2629800, 'week', 604800],
    [31557600, 'month', 2629800],
  ]
  const abs = Math.abs(diff)
  if (abs < 45) return 'just now'
  for (const [limit, unit, div = 1] of table) {
    if (abs < limit) return rtf.format(Math.round(diff / div), unit)
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fileExt(name = '') {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext && ext !== name.toLowerCase() ? ext : 'file'
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
