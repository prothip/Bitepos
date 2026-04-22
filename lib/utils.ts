import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique order number
 * Format: TB-YYYYMMDD-XXXX
 */
export function generateOrderNumber(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `TB-${date}-${random}`
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format date and time together
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${formatDate(d)} ${formatTime(d)}`
}

/**
 * Get product name in the given locale
 */
export function getLocalizedName(
  product: { nameEn: string; nameMy: string; nameZh: string; nameTh: string },
  locale: string
): string {
  switch (locale) {
    case 'my':
      return product.nameMy || product.nameEn
    case 'zh':
      return product.nameZh || product.nameEn
    case 'th':
      return product.nameTh || product.nameEn
    default:
      return product.nameEn
  }
}

/**
 * Get description in the given locale
 */
export function getLocalizedDescription(
  item: {
    descriptionEn?: string | null
    descriptionMy?: string | null
    descriptionZh?: string | null
    descriptionTh?: string | null
  },
  locale: string
): string {
  switch (locale) {
    case 'my':
      return item.descriptionMy || item.descriptionEn || ''
    case 'zh':
      return item.descriptionZh || item.descriptionEn || ''
    case 'th':
      return item.descriptionTh || item.descriptionEn || ''
    default:
      return item.descriptionEn || ''
  }
}

/**
 * Truncate text to a given length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Check if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Check if a string is a valid Thai phone number
 */
export function isValidPhone(phone: string): boolean {
  return /^(\+66|0)[0-9]{8,9}$/.test(phone.replace(/\s|-/g, ''))
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Parse query params safely
 */
export function safeParseInt(value: string | null | undefined, fallback: number = 0): number {
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Format a number with commas
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * Get status color class for order status
 */
export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'preparing':
      return 'bg-blue-100 text-blue-800'
    case 'ready':
      return 'bg-green-100 text-green-800'
    case 'served':
      return 'bg-purple-100 text-purple-800'
    case 'completed':
      return 'bg-gray-100 text-gray-800'
    case 'voided':
      return 'bg-red-100 text-red-800'
    case 'held':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get stock status
 */
export function getStockStatus(qty: number, threshold: number): 'out' | 'low' | 'ok' {
  if (qty === 0) return 'out'
  if (qty <= threshold) return 'low'
  return 'ok'
}
