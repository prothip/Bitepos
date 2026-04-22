'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, RotateCcw, X, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTHB } from '@/lib/currency'
import { usePOSStore, HeldOrder } from '@/store/posStore'

export default function HeldOrdersPanel() {
  const t = useTranslations('pos')
  const { heldOrders, retrieveOrder, removeHeldOrder } = usePOSStore()
  const [isOpen, setIsOpen] = useState(false)

  if (heldOrders.length === 0 && !isOpen) return null

  return (
    <>
      {/* Badge button */}
      {heldOrders.length > 0 && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
        >
          <Clock className="w-4 h-4" />
          {t('heldOrders')} ({heldOrders.length})
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-orange-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-gray-900">{t('heldOrders')}</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {heldOrders.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('noHeldOrders')}</p>
                </div>
              ) : (
                heldOrders.map((order) => (
                  <HeldOrderCard
                    key={order.id}
                    order={order}
                    onRetrieve={() => {
                      retrieveOrder(order.id)
                      setIsOpen(false)
                    }}
                    onRemove={() => removeHeldOrder(order.id)}
                    t={t}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function HeldOrderCard({
  order,
  onRetrieve,
  onRemove,
  t,
}: {
  order: HeldOrder
  onRetrieve: () => void
  onRemove: () => void
  t: (key: string) => string
}) {
  const total = order.items.reduce((sum, item) => sum + item.subtotal, 0)

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-800">{order.name}</p>
          <p className="text-xs text-gray-500">
            {new Date(order.createdAt).toLocaleTimeString()} · {order.items.length} items
          </p>
        </div>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1 mb-3">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.product.id} className="flex justify-between text-sm">
            <span className="text-gray-600 truncate">{item.product.nameEn} × {item.quantity}</span>
            <span className="text-gray-800 font-medium">{formatTHB(item.subtotal)}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-xs text-gray-400">+{order.items.length - 3} more</p>
        )}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <span className="font-bold text-gray-900">{formatTHB(total)}</span>
        <button
          onClick={onRetrieve}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('retrieve')}
        </button>
      </div>
    </div>
  )
}