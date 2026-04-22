'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Eye, Ban, Clock, CheckCircle2, XCircle, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTHB } from '@/lib/currency'
import { useActiveBranch } from '@/lib/use-active-branch'

interface OrderItem {
  id: string; nameSnapshot: string; priceSnapshot: number; quantity: number; subtotal: number; notes: string | null
  product: { nameEn: string }; modifiers: Array<{ nameSnapshot: string; priceSnapshot: number }>
}

interface Payment {
  id: string; method: string; amount: number; tendered: number | null; change: number | null
}

interface Order {
  id: string; orderNumber: string; type: string; status: string
  subtotal: number; taxAmount: number; discountAmount: number; total: number
  vatMode: string; notes: string | null; isHeld: boolean
  createdAt: string
  table: { name: string } | null; staff: { name: string } | null; customer: { name: string } | null
  items: OrderItem[]; payments: Payment[]
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  voided: 'bg-red-100 text-red-700',
  held: 'bg-blue-100 text-blue-700',
}

export default function OrdersPage() {
  const { branch: activeBranch } = useActiveBranch()
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const tOrders = useTranslations('orders')

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const branchId = localStorage.getItem('bitepos-active-branch') || ''
      const url = branchId ? `/api/orders?limit=500&branchId=${branchId}` : '/api/orders?limit=500'
      const res = await fetch(url)
      if (res.ok) setOrders(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders, activeBranch?.id])

  const filtered = orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  async function voidOrder(id: string) {
    if (!confirm(t('confirmDelete'))) return
    await fetch(`/api/orders?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'voided' }) })
    fetchOrders()
  }

  const typeLabels: Record<string, string> = { 'dine-in': tOrders('dineIn'), takeaway: tOrders('takeaway'), delivery: tOrders('delivery') }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('orders')}</h1>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tCommon('search') + ' order #...'} className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm" />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'completed', 'voided', 'held'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                filterStatus === s ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50')}>
              {s === 'all' ? tCommon('all') : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{tCommon('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('noData')}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-gray-900">#{o.orderNumber}</p>
                    <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()} · {typeLabels[o.type] || o.type}</p>
                  </div>
                  {o.table && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{o.table.name}</span>}
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-gray-900">{formatTHB(o.total)}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-600')}>{o.status}</span>
                  {o.status === 'pending' && (
                    <button onClick={e => { e.stopPropagation(); voidOrder(o.id) }} className="p-1.5 hover:bg-red-50 rounded-lg" title="Void">
                      <Ban className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
              {expandedId === o.id && (
                <div className="px-5 py-4 border-t bg-gray-50">
                  <div className="grid gap-2 text-sm">
                    {o.items.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.quantity}x {item.nameSnapshot} {item.notes ? <span className="text-gray-400">({item.notes})</span> : null}</span>
                        <span className="font-medium">{formatTHB(item.subtotal)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatTHB(o.subtotal)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>VAT ({o.vatMode})</span><span>{formatTHB(o.taxAmount)}</span></div>
                      {o.discountAmount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{formatTHB(o.discountAmount)}</span></div>}
                      <div className="flex justify-between font-bold text-gray-900"><span>Total</span><span>{formatTHB(o.total)}</span></div>
                    </div>
                    {o.payments.length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        {o.payments.map(p => (
                          <div key={p.id} className="flex justify-between text-gray-500">
                            <span>{p.method}</span>
                            <span>{formatTHB(p.amount)}{p.tendered ? ` / Tendered: ${formatTHB(p.tendered)} / Change: ${formatTHB(p.change || 0)}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}