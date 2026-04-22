'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search, Edit2, Trash2, Star, Package, Camera, X, Download, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTHB } from '@/lib/currency'
import { useFeatureFlags } from '@/lib/use-feature-flags'

interface Category {
  id: string; nameEn: string; nameMy: string; nameZh: string; nameTh: string; color: string
}

interface Product {
  id: string; sku: string | null; barcode: string | null; nameEn: string; nameMy: string; nameZh: string; nameTh: string
  price: number; costPrice: number | null; categoryId: string; imageUrl: string | null; isActive: boolean
  trackStock: boolean; stockQty: number; isFavorite: boolean; vatMode: string; pricingType: string; unit: string | null; stepWeight: number | null
  category: Category
}

export default function ProductsPage() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const { flags } = useFeatureFlags()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    nameEn: '', nameMy: '', nameZh: '', nameTh: '',
    price: '', costPrice: '', sku: '', barcode: '',
    categoryId: '', isActive: true, trackStock: false, stockQty: '0',
    vatMode: 'exclusive', isFavorite: false, imageUrl: '',
    pricingType: 'per_item', unit: 'kg', stepWeight: '0.05',
  })
  const [uploading, setUploading] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products')
      if (res.ok) setProducts(await res.json())
    } finally { setLoading(false) }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) setCategories(await res.json())
    } catch {}
  }, [])

  useEffect(() => { fetchProducts(); fetchCategories() }, [fetchProducts, fetchCategories])

  const filtered = products.filter(p => {
    if (filterCat !== 'all' && p.categoryId !== filterCat) return false
    if (search && !p.nameEn.toLowerCase().includes(search.toLowerCase()) && !(p.sku || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function openAdd() {
    setEditProduct(null)
    setForm({ nameEn: '', nameMy: '', nameZh: '', nameTh: '', price: '', costPrice: '', sku: '', barcode: '', categoryId: categories[0]?.id || '', isActive: true, trackStock: false, stockQty: '0', vatMode: 'exclusive', isFavorite: false, imageUrl: '', pricingType: 'per_item', unit: 'kg', stepWeight: '0.05' })
    setShowModal(true)
  }

  function handleExport() {
    const a = document.createElement('a')
    a.href = '/api/products?action=export'
    a.download = `bitepos-products-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/products?action=import', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        alert(`Import done! Created: ${data.created}, Updated: ${data.updated}, Skipped: ${data.skipped}${data.errors ? '\nErrors: ' + data.errors.join('\n') : ''}`)
        fetchProducts()
      } else {
        alert('Import failed: ' + (data.error || 'Unknown error'))
      }
    } catch {
      alert('Import failed: Network error')
    }
    e.target.value = ''
  }

  function openEdit(p: Product) {
    setEditProduct(p)
    setForm({
      nameEn: p.nameEn, nameMy: p.nameMy, nameZh: p.nameZh, nameTh: p.nameTh,
      price: p.price.toString(), costPrice: (p.costPrice || '').toString(), sku: p.sku || '', barcode: p.barcode || '',
      categoryId: p.categoryId, isActive: p.isActive, trackStock: p.trackStock, stockQty: p.stockQty.toString(),
      vatMode: p.vatMode, isFavorite: p.isFavorite, imageUrl: p.imageUrl || '',
      pricingType: p.pricingType || 'per_item', unit: p.unit || 'kg', stepWeight: (p.stepWeight || 0.05).toString(),
    })
    setShowModal(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        setForm(f => ({ ...f, imageUrl: url }))
      }
    } finally { setUploading(false) }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        ...form,
        imageUrl: form.imageUrl || null,
        price: parseFloat(form.price) || 0,
        costPrice: parseFloat(form.costPrice) || null,
        stockQty: parseInt(form.stockQty) || 0,
        pricingType: form.pricingType,
        unit: form.pricingType === 'per_unit' ? form.unit : null,
        stepWeight: form.pricingType === 'per_unit' ? parseFloat(form.stepWeight) || 0.05 : null,
      }
      if (editProduct) {
        await fetch(`/api/products?id=${editProduct.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setShowModal(false)
      fetchProducts()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
    fetchProducts()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('products')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4" /> Import
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> {t('addProduct')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tCommon('search') + '...'} className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border rounded-xl px-3 py-2 text-sm">
          <option value="all">{tCommon('all')} {t('categories')}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
        </select>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">{tCommon('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('noData')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {p.isFavorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: p.category?.color + '20', color: p.category?.color }}>{p.category?.nameEn}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {p.imageUrl ? <img src={p.imageUrl} className="w-16 h-16 rounded-lg object-cover" /> : <Package className="w-6 h-6 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{p.nameEn}</p>
                  <p className="text-xs text-gray-500">{p.sku || '—'}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-bold text-primary">{formatTHB(p.price)}{p.pricingType === 'per_unit' ? `/${p.unit || 'kg'}` : ''}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {p.trackStock && <span className={p.stockQty <= 5 ? 'text-red-500 font-medium' : ''}>{p.stockQty} qty</span>}
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', p.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500')}>
                    {p.isActive ? tCommon('active') : tCommon('inactive')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-lg">{editProduct ? t('editProduct') : t('addProduct')}</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {[
                { key: 'nameEn', label: 'English Name' },
                { key: 'nameTh', label: 'Thai Name (ชื่อ)' },
                { key: 'nameMy', label: 'Myanmar Name' },
                { key: 'nameZh', label: 'Chinese Name (中文名)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
              {/* Image Upload */}
              <div>
                <label className="text-sm font-medium text-gray-700">Product Image</label>
                <div className="mt-1 flex items-center gap-4">
                  {form.imageUrl ? (
                    <div className="relative">
                      <img src={form.imageUrl} className="w-20 h-20 rounded-lg object-cover border" />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      {uploading ? (
                        <span className="text-xs text-gray-400">Uploading...</span>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-gray-400" />
                          <span className="text-[10px] text-gray-400 mt-0.5">Upload</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('productPrice')} (฿)</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('productCost')} (฿)</label>
                  <input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('productSku')}</label>
                  <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                {flags.barcode && (<div>
                  <label className="text-sm font-medium text-gray-700">Barcode</label>
                  <input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>)}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('productCategory')}</label>
                <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">VAT Mode</label>
                <select value={form.vatMode} onChange={e => setForm(f => ({ ...f, vatMode: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="exclusive">Exclusive</option>
                  <option value="inclusive">Inclusive</option>
                  <option value="none">No VAT</option>
                </select>
              </div>
              {/* Weight Pricing */}
              {flags.weightPricing && (
              <div>
                <label className="text-sm font-medium text-gray-700">Pricing Type</label>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, pricingType: 'per_item' }))}
                    className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors', form.pricingType === 'per_item' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:border-primary/50')}
                  >Per Item</button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, pricingType: 'per_unit' }))}
                    className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors', form.pricingType === 'per_unit' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:border-primary/50')}
                  >Per Unit (Weight)</button>
                </div>
                {form.pricingType === 'per_unit' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Unit</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="lb">lb</option>
                      <option value="oz">oz</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Weight Step</label>
                    <input type="number" step="0.01" value={form.stepWeight} onChange={e => setForm(f => ({ ...f, stepWeight: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                )}
              </div>
              )}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} /> {tCommon('active')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isFavorite} onChange={e => setForm(f => ({ ...f, isFavorite: e.target.checked }))} /> <Star className="w-4 h-4 text-yellow-400" /> Favorite
                </label>
                {flags.trackStock && (<label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.trackStock} onChange={e => setForm(f => ({ ...f, trackStock: e.target.checked }))} /> {t('trackStock')}
                </label>)}
              </div>
              {form.trackStock && (
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('productStock')}</label>
                  <input type="number" value={form.stockQty} onChange={e => setForm(f => ({ ...f, stockQty: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm">{tCommon('cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? tCommon('loading') : tCommon('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}