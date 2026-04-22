/**
 * Currency utilities for Thai Baht (THB)
 */

export const CURRENCY_SYMBOL = '฿'
export const CURRENCY_CODE = 'THB'

/**
 * Format a number as Thai Baht
 */
export function formatCurrency(amount: number, options?: {
  showSymbol?: boolean
  decimals?: number
  compact?: boolean
}): string {
  const {
    showSymbol = true,
    decimals = 2,
    compact = false,
  } = options ?? {}

  if (compact && amount >= 1000000) {
    const millions = amount / 1000000
    return `${showSymbol ? CURRENCY_SYMBOL : ''}${millions.toFixed(1)}M`
  }

  if (compact && amount >= 1000) {
    const thousands = amount / 1000
    return `${showSymbol ? CURRENCY_SYMBOL : ''}${thousands.toFixed(1)}K`
  }

  const formatted = amount.toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return showSymbol ? `${CURRENCY_SYMBOL}${formatted}` : formatted
}

/**
 * Format as THB with 2 decimal places (standard)
 */
export function formatTHB(amount: number): string {
  return formatCurrency(amount, { showSymbol: true, decimals: 2 })
}

/**
 * Format as compact THB (no decimals for display)
 */
export function formatTHBCompact(amount: number): string {
  return formatCurrency(amount, { showSymbol: true, decimals: 0, compact: true })
}

/**
 * Parse a currency string back to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[฿,\s]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Round to 2 decimal places (standard for currency)
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Calculate percentage of amount
 */
export function calculatePercentage(amount: number, percent: number): number {
  return roundCurrency((amount * percent) / 100)
}
