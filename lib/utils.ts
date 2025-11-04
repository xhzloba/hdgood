import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ratingColor(r?: number | string) {
  const val = typeof r === 'string' ? parseFloat(r) : r
  if (val == null || Number.isNaN(val)) return 'text-zinc-500'
  if (val < 5.6) return 'text-red-600'
  if (val <= 6.9) return 'text-orange-400'
  if (val < 8.0) return 'text-green-400'
  return 'text-green-500'
}
