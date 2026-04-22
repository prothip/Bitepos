'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Package, Search, AlertTriangle, ToggleLeft, ToggleRight, Save } from 'lucide-react'
import { formatTHB } from '@/lib/currency'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  nameEn: string
  nameTh: string
  nameMy: string
  nameZh: string
  price: number
  stock: number
  trackStock: boolean
  lowStockThreshold: number
  isActive: boolean
  category: { id: string; nameEn: string; color: string } | null
}

export default function InventoryPage() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'tracked'>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, { stock: number; lowStockThreshold: number }>>({})

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data)
      const vals: Record<string, { stock: number; lowStockThreshold: number }> = {}
      data.forEach((p: Product) => { vals[p.id] = { stock: p.stock, lowStockThreshold: p.lowStockThreshold } })
      setEditValues(vals)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = products.filter(p => {
    if (search) {
      const q = search.toLowerCase()
      if (!p.nameEn.toLowerCase().includes(q) && !p.nameTh.toLowerCase().includes(q)) return false
    }
    if (filter === 'tracked' && !p.trackStock) return false
    if (filter === 'low' && !(p.trackStock && p.stock <= p.lowStockThreshold)) return false
    return true
  })

  const lowStockCount = products.filter(p => p.trackStock && p.stock <= p.lowStockThreshold).length
  const trackedCount = products.filter(p => p.trackStock).length

  async function saveProduct(id: string) {
    setSaving(id)
    try {
      const vals = editValues[id]
      await fetch(`/api/products?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: vals.stock, lowStockThreshold: vals.lowStockThreshold }),
      })
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...vals } : p))
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(null)
    }
  }

  async function toggleTrackStock(id: string, current: boolean) {
    try {
      await fetch(`/api/products?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackStock: !current }),
      })
      setProducts(prev => prev.map(p => p.id === id ? { ...p, trackStock: !current } : p))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">{tCommon('loading')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-7 h-7" /> {t('inventory')}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {trackedCount} tracked · {lowStockCount} low stock
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Stock Tracked</p>
          <p className="text-2xl font-bold text-blue-600">{trackedCount}</p>
        </div>
        <div className={cn("rounded-xl border p-4", lowStockCount > 0 ? "bg-red-50 border-red-200" : "bg-white")}>
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <p className={cn("text-2xl font-bold", lowStockCount > 0 ? "text-red-600" : "text-green-600")}>
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'tracked', 'low'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {f === 'all' ? 'All' : f === 'tracked' ? 'Tracked' : 'Low Stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Product</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Price</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Track Stock</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Current Stock</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Low Threshold</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(product => {
              const isLow = product.trackStock && product.stock <= product.lowStockThreshold
              const vals = editValues[product.id] || { stock: product.stock, lowStockThreshold: product.lowStockThreshold }

              return (
                <tr key={product.id} className={cn(isLow && 'bg-red-50/50')}>
                  <td className="px-4 py-3 font-medium text-gray-900">{product.nameEn}</td>
                  <td className="px-4 py-3">
                    {product.category && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: product.category.color }}>
                        {product.category.nameEn}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatTHB(product.price)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleTrackStock(product.id, product.trackStock)} className="text-primary">
                      {product.trackStock ? <ToggleRight className="w-6 h-6 mx-auto" /> : <ToggleLeft className="w-6 h-6 mx-auto text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.trackStock ? (
                      <input
                        type="number"
                        value={vals.stock}
                        onChange={e => setEditValues(prev => ({ ...prev, [product.id]: { ...prev[product.id], stock: parseInt(e.target.value) || 0 } }))}
                        className={cn(
                          'w-20 text-center border rounded-lg px-2 py-1 text-sm',
                          isLow ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        )}
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.trackStock ? (
                      <input
                        type="number"
                        value={vals.lowStockThreshold}
                        onChange={e => setEditValues(prev => ({ ...prev, [product.id]: { ...prev[product.id], lowStockThreshold: parseInt(e.target.value) || 0 } }))}
                        className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!product.trackStock ? (
                      <span className="text-xs text-gray-400">Not tracked</span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" /> Low
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.trackStock && (vals.stock !== product.stock || vals.lowStockThreshold !== product.lowStockThreshold) && (
                      <button
                        onClick={() => saveProduct(product.id)}
                        disabled={saving === product.id}
                        className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No products found</div>
        )}
      </div>
    </div>
  )
}