'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Category {
  id: string; nameEn: string; nameMy: string; nameZh: string; nameTh: string; color: string; sortOrder: number; isActive: boolean
}

const COLORS = ['#E85D04', '#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2', '#4F46E5', '#DB2777', '#65A30D']

export default function CategoriesPage() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ nameEn: '', nameMy: '', nameZh: '', nameTh: '', color: '#E85D04', sortOrder: '0', isActive: true })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories?active=false')
      if (res.ok) setCategories(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  function openAdd() {
    setEditCat(null)
    setForm({ nameEn: '', nameMy: '', nameZh: '', nameTh: '', color: '#E85D04', sortOrder: '0', isActive: true })
    setShowModal(true)
  }

  function openEdit(c: Category) {
    setEditCat(c)
    setForm({ nameEn: c.nameEn, nameMy: c.nameMy, nameZh: c.nameZh, nameTh: c.nameTh, color: c.color, sortOrder: c.sortOrder.toString(), isActive: c.isActive })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = { ...form, sortOrder: parseInt(form.sortOrder) || 0 }
      if (editCat) {
        await fetch(`/api/categories?id=${editCat.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setShowModal(false)
      fetchCategories()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    fetchCategories()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('categories')}</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {t('addCategory')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{tCommon('loading')}</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('noData')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color + '20' }}>
                <Tag className="w-5 h-5" style={{ color: c.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{c.nameEn}</p>
                <p className="text-xs text-gray-500 truncate">{c.nameTh} · {c.nameMy}</p>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', c.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500')}>
                  {c.isActive ? tCommon('active') : tCommon('inactive')}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-lg">{editCat ? t('editCategory') : t('addCategory')}</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {[
                { key: 'nameEn', label: 'English' },
                { key: 'nameTh', label: 'Thai (ไทย)' },
                { key: 'nameMy', label: 'Myanmar (မြန်မာ)' },
                { key: 'nameZh', label: 'Chinese (中文)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-gray-700">{t('categoryColor')}</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={cn('w-8 h-8 rounded-lg border-2', form.color === c ? 'border-gray-800 scale-110' : 'border-transparent')}>
                      <div className="w-full h-full rounded-md" style={{ backgroundColor: c }} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} /> {tCommon('active')}
              </label>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm">{tCommon('cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? tCommon('loading') : tCommon('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}