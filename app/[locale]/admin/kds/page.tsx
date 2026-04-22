'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, CheckCircle2, ChefHat, AlertCircle, RefreshCw, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTHB } from '@/lib/currency'

interface KDSItem {
  id: string; nameSnapshot: string; quantity: number; notes: string | null
  modifiers: Array<{ nameSnapshot: string; priceSnapshot: number }>
}

interface KDSOrder {
  id: string; orderNumber: string; type: string; status: string
  table: { name: string } | null; staff: { name: string } | null
  items: KDSItem[]; notes: string | null
  createdAt: string
  minutesAgo: number
}

const MAX_ORDERS = 20
const REFRESH_INTERVAL = 10000 // 10 seconds

export default function KDSPage() {
  const t = useTranslations('admin')
  const tOrders = useTranslations('orders')
  const [orders, setOrders] = useState<KDSOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [sound, setSound] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevOrderCount = useRef(0)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?limit=50')
      if (!res.ok) return
      const data = await res.json()
      const pending = data
        .filter((o: any) => o.status === 'pending' || o.status === 'held')
        .map((o: any) => {
          const created = new Date(o.createdAt)
          const minutesAgo = Math.floor((Date.now() - created.getTime()) / 60000)
          return { ...o, minutesAgo }
        })
        .sort((a: KDSOrder, b: KDSOrder) => a.minutesAgo - b.minutesAgo)
        .slice(0, MAX_ORDERS)

      // Play sound if new orders appeared
      if (sound && pending.length > prevOrderCount.current && prevOrderCount.current > 0) {
        try { audioRef.current?.play() } catch {}
      }
      prevOrderCount.current = pending.length
      setOrders(pending)
    } catch {} finally { setLoading(false) }
  }, [sound])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchOrders])

  async function markComplete(id: string) {
    await fetch(`/api/orders?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    fetchOrders()
  }

  const typeLabel: Record<string, string> = { 'dine-in': '🍽️', 'takeaway': '🥡', 'delivery': '🚗' }

  const urgencyColor = (mins: number) => {
    if (mins >= 20) return 'border-red-500 bg-red-50'
    if (mins >= 10) return 'border-orange-400 bg-orange-50'
    return 'border-green-400 bg-white'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-orange-400" />
          <h1 className="text-2xl font-bold">Kitchen Display</h1>
          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            {orders.length} orders
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchOrders()} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700">
            <RefreshCw className="w-5 h-5" />
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sound} onChange={e => setSound(e.target.checked)} className="rounded" />
            🔔 Sound
          </label>
        </div>
      </div>

      {/* Audio for new order notification */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRl9vT19teleXBlc3Rlcg==" preload="auto" />

      {/* Orders Grid */}
      {loading && orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">All caught up! No pending orders.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map(order => (
            <div key={order.id} className={cn('rounded-xl border-2 p-4 shadow-lg', urgencyColor(order.minutesAgo))}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeLabel[order.type] || '📋'}</span>
                  <span className="font-bold text-gray-900 text-lg">#{order.orderNumber}</span>
                </div>
                <div className={cn(
                  'px-2 py-1 rounded-full text-xs font-bold',
                  order.minutesAgo >= 20 ? 'bg-red-500 text-white' :
                  order.minutesAgo >= 10 ? 'bg-orange-500 text-white' :
                  'bg-green-500 text-white'
                )}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {order.minutesAgo}m
                </div>
              </div>

              {order.table && (
                <p className="text-sm text-gray-600 mb-2">Table: {order.table.name}{order.staff ? ` · ${order.staff.name}` : ''}</p>
              )}

              <div className="space-y-2 mb-3">
                {order.items.map(item => (
                  <div key={item.id} className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-lg">{item.quantity}×</span>
                      <span className="flex-1 ml-2 text-gray-900">{item.nameSnapshot}</span>
                    </div>
                    {item.modifiers?.length > 0 && (
                      <div className="ml-8 text-sm text-gray-500">
                        {item.modifiers.map(m => (
                          <div key={m.nameSnapshot}>+ {m.nameSnapshot}</div>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <div className="ml-8 text-sm text-orange-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3 text-sm text-yellow-700">
                  📝 {order.notes}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                >
                  <Printer className="w-4 h-4" /> Reprint
                </button>
                <button
                  onClick={() => markComplete(order.id)}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
                >
                  ✓ Done
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}