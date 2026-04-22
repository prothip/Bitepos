/**
 * VAT/Tax calculation utilities for Thai POS system
 * Thailand standard VAT rate: 7%
 */

export type VatMode = 'inclusive' | 'exclusive' | 'none'

export interface TaxCalculation {
  subtotal: number
  taxAmount: number
  total: number
  taxRate: number
  vatMode: VatMode
}

/**
 * Calculate tax for a given amount and mode
 */
export function calculateTax(
  amount: number,
  taxRate: number,
  vatMode: VatMode
): TaxCalculation {
  const rate = taxRate / 100

  if (vatMode === 'none' || taxRate === 0) {
    return {
      subtotal: amount,
      taxAmount: 0,
      total: amount,
      taxRate,
      vatMode,
    }
  }

  if (vatMode === 'inclusive') {
    // Tax is already included in the price
    // subtotal = total / (1 + rate)
    const subtotal = amount / (1 + rate)
    const taxAmount = amount - subtotal
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: amount,
      taxRate,
      vatMode,
    }
  }

  // vatMode === 'exclusive'
  // Tax is added on top of the price
  const taxAmount = amount * rate
  const total = amount + taxAmount
  return {
    subtotal: amount,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    taxRate,
    vatMode,
  }
}

/**
 * Get the base price (before tax) from a displayed price
 */
export function getBasePrice(displayPrice: number, taxRate: number, vatMode: VatMode): number {
  if (vatMode === 'inclusive') {
    return displayPrice / (1 + taxRate / 100)
  }
  return displayPrice
}

/**
 * Get the display price (what customer pays)
 */
export function getDisplayPrice(basePrice: number, taxRate: number, vatMode: VatMode): number {
  if (vatMode === 'exclusive') {
    return basePrice * (1 + taxRate / 100)
  }
  return basePrice
}

/**
 * Calculate order totals with tax
 */
export function calculateOrderTotals(
  items: Array<{ priceSnapshot: number; quantity: number; subtotal: number }>,
  taxRate: number,
  vatMode: VatMode,
  discountAmount: number = 0
): {
  itemsTotal: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
} {
  const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const afterDiscount = Math.max(0, itemsTotal - discountAmount)
  const taxCalc = calculateTax(afterDiscount, taxRate, vatMode)

  return {
    itemsTotal,
    subtotal: vatMode === 'inclusive' ? taxCalc.subtotal : afterDiscount,
    discountAmount,
    taxAmount: taxCalc.taxAmount,
    total: taxCalc.total,
  }
}

/**
 * Format tax mode for display
 */
export function formatVatMode(vatMode: VatMode): string {
  switch (vatMode) {
    case 'inclusive':
      return 'VAT Inclusive'
    case 'exclusive':
      return 'VAT Exclusive'
    case 'none':
      return 'No VAT'
  }
}
