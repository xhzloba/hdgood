import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ratingColor(r?: number | string) {
  const val = typeof r === 'string' ? parseFloat(r) : r
  if (val == null || Number.isNaN(val)) return 'text-zinc-500'
  if (val <= 5.5) return 'text-red-600'
  if (val <= 6.9) return 'text-orange-400'
  if (val < 8.0) return 'text-green-400'
  return 'text-green-500'
}

export function ratingBgColor(r?: number | string) {
  const val = typeof r === 'string' ? parseFloat(r) : r
  if (val == null || Number.isNaN(val)) return 'bg-zinc-700'
  if (val === 0) return 'bg-zinc-800'
  if (val <= 5.5) return 'bg-red-600'
  if (val < 7.0) return 'bg-zinc-700'
  return 'bg-green-600'
}

export function formatRatingLabel(r?: number | string) {
  const val = typeof r === 'string' ? parseFloat(r) : r
  if (val === 0) return '—'
  if (val == null || Number.isNaN(val)) return ''
  return val.toFixed(1)
}

export function formatCurrency(val: any) {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;
  
  // Try to find the total after "=" if present
  let clean = s;
  if (s.includes('=')) {
    clean = s.split('=').pop() || "";
  }
  
  // Remove non-digits
  const digits = clean.replace(/\D/g, '');
  if (!digits) return s; // Return original if no digits found
  
  const num = parseInt(digits, 10);
  if (isNaN(num)) return s;
  
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(num);
}
