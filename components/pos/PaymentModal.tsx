'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, Banknote, CreditCard, Smartphone, Award, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTHB } from '@/lib/currency'
import PromptPayQR from './PromptPayQR'

interface CartItem {
  product: { id: string; nameEn: string; nameTh: string; nameMy: string; nameZh: string; price: number }
  quantity: number
  notes: string
  subtotal: number
}

interface PaymentModalProps {
  cart: CartItem[]
  cartTotal: number
  taxAmount: number
  orderTotal: number
  locale: string
  onClose: () => void
  onComplete: (method: string, tendered: number, change: number) => void
}

type PaymentMethod = 'cash' | 'card' | 'mobile' | 'points'

export default function PaymentModal({ cart, cartTotal, taxAmount, orderTotal, locale, onClose, onComplete }: PaymentModalProps) {
  const t = useTranslations('pos')
  const tCommon = useTranslations('common')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [tendered, setTendered] = useState(Math.ceil(orderTotal).toString())
  const [processing, setProcessing] = useState(false)
  const [splitIndex, setSplitIndex] = useState(1)
  const [splitWays, setSplitWays] = useState(2)
  const [showPromptPay, setShowPromptPay] = useState(false)

  const tenderedNum = parseFloat(tendered) || 0
  const change = method === 'cash' ? tenderedNum - orderTotal : 0
  const splitAmount = orderTotal / splitWays

  async function handleComplete() {
    setProcessing(true)
    // Mock payment processing
    await new Promise(res => setTimeout(res, 800))
    setProcessing(false)
    onComplete(method, tenderedNum, Math.max(0, change))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">{t('selectPaymentMethod')}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{tCommon('subtotal')}</span>
            <span>{formatTHB(cartTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{tCommon('tax')} (7%)</span>
            <span>{formatTHB(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t">
            <span>{tCommon('total')}</span>
            <span className="text-primary text-xl">{formatTHB(orderTotal)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {([
              { m: 'cash' as PaymentMethod, label: t('cashPayment'), icon: Banknote, desc: t('changeDue') },
              { m: 'card' as PaymentMethod, label: t('cardPayment'), icon: CreditCard, desc: t('mockCardPayment') },
              { m: 'mobile' as PaymentMethod, label: t('mobilePayment'), icon: Smartphone, desc: t('promptPayQR') },
              { m: 'points' as PaymentMethod, label: t('loyaltyPoints'), icon: Award, desc: `${formatTHB(0)}` },
            ]).map(({ m, label, icon: Icon, desc }) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  method === m
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-primary/30'
                )}
              >
                <Icon className={cn('w-8 h-8', method === m ? 'text-primary' : 'text-gray-500')} />
                <span className="text-sm font-semibold text-gray-800">{label}</span>
                <span className="text-xs text-gray-400">{desc}</span>
              </button>
            ))}
          </div>

          {/* Cash: tendered input */}
          {method === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">{t('amountTendered')}</label>
                <input
                  type="number"
                  value={tendered}
                  onChange={e => setTendered(e.target.value)}
                  min={0}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:border-primary"
                />
              </div>
              {/* Quick amount buttons */}
              <div className="flex gap-2 flex-wrap">
                {[Math.ceil(orderTotal), 1000, 2000, 5000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTendered(String(amt))}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-sm font-medium',
                      tenderedNum === amt
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 text-gray-600 hover:border-primary/50'
                    )}
                  >
                    {formatTHB(amt)}
                  </button>
                ))}
              </div>
              {change >= 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-green-700 font-medium">{t('changeDue')}</span>
                  <span className="text-xl font-bold text-green-700">{formatTHB(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Card: mock authorize */}
          {method === 'card' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">{t('mockCardPayment')}</span>
              </div>
              <p className="text-xs text-blue-600/80">Tap to authorize ฿{orderTotal.toFixed(2)} on mock terminal...</p>
            </div>
          )}

          {/* Mobile: PromptPay QR */}
          {method === 'mobile' && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-4 flex flex-col items-center">
              <button onClick={() => setShowPromptPay(true)} className="w-full">
                <Smartphone className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-purple-700 mb-1">{t('promptPayQR')}</p>
                <div className="bg-white border-2 border-purple-300 rounded-xl w-48 h-48 mx-auto flex items-center justify-center mb-2">
                  <div className="text-center">
                    <div className="text-5xl mb-2">📱</div>
                    <p className="text-xs text-gray-500">Tap to show QR</p>
                  </div>
                </div>
              </button>
              <p className="text-xs text-purple-600/70">{t('mockMobilePayment')}</p>
            </div>
          )}
          {showPromptPay && method === 'mobile' && (
            <PromptPayQR amount={orderTotal} onClose={() => setShowPromptPay(false)} />
          )}

          {/* Points */}
          {method === 'points' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-center">
              <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm text-yellow-700 font-medium">{t('loyaltyPoints')}</p>
              <p className="text-xs text-yellow-600/80 mt-1">{t('pointsBalance')}: {formatTHB(0)}</p>
            </div>
          )}

          {/* Split bill */}
          <div className="mt-3 border-t pt-3">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                {t('splitBill')}
                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Split by way:</span>
                  <div className="flex gap-1">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => { setSplitWays(n); setSplitIndex(1); }}
                        className={cn(
                          'w-8 h-8 rounded-lg border text-sm font-medium',
                          splitWays === n ? 'border-primary bg-primary text-white' : 'border-gray-200'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {Array.from({ length: splitWays }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSplitIndex(i + 1)}
                      className={cn(
                        'flex-1 min-w-20 py-2 rounded-lg border text-xs font-medium',
                        splitIndex === i + 1
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 text-gray-500'
                      )}
                    >
                      {t('splitBill')} {i + 1}<br />{formatTHB(splitAmount)}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {tCommon('cancel')}
          </button>
          <button
            onClick={handleComplete}
            disabled={processing || (method === 'cash' && tenderedNum < orderTotal)}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold transition-colors',
              method === 'cash' && tenderedNum < orderTotal
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            )}
          >
            {processing ? tCommon('loading') + '...' : t('payNow') + ' ' + formatTHB(orderTotal)}
          </button>
        </div>
      </div>
    </div>
  )
}
