'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Edit2, Trash2, Armchair } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Table {
  id: string; name: string; section: string; seats: number; posX: number; posY: number
  width: number; height: number; isActive: boolean
}

export default function TablesPage() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTable, setEditTable] = useState<Table | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ name: '', section: 'Main', seats: '4', isActive: true })

  const fetchTables = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tables')
      if (res.ok) setTables(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTables() }, [fetchTables])

  function openAdd() {
    setEditTable(null)
    setForm({ name: '', section: 'Main', seats: '4', isActive: true })
    setShowModal(true)
  }

  function openEdit(tb: Table) {
    setEditTable(tb)
    setForm({ name: tb.name, section: tb.section, seats: tb.seats.toString(), isActive: tb.isActive })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = { ...form, seats: parseInt(form.seats) || 4 }
      if (editTable) {
        await fetch(`/api/tables?id=${editTable.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setShowModal(false)
      fetchTables()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    await fetch(`/api/tables?id=${id}`, { method: 'DELETE' })
    fetchTables()
  }

  async function toggleActive(tb: Table) {
    await fetch(`/api/tables?id=${tb.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !tb.isActive }) })
    fetchTables()
  }

  const sections = [...new Set(tables.map(t => t.section))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('tables')}</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {t('addTable')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{tCommon('loading')}</div>
      ) : sections.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('noData')}</div>
      ) : (
        sections.map(section => (
          <div key={section}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{section}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tables.filter(t => t.section === section).map(tb => (
                <div key={tb.id} className={cn(
                  'bg-white rounded-xl p-4 shadow-sm border-2 transition-all cursor-pointer',
                  tb.isActive ? 'border-green-200 hover:border-green-400' : 'border-gray-200 opacity-50'
                )} onClick={() => openEdit(tb)}>
                  <div className="flex items-center justify-between mb-2">
                    <Armchair className={cn('w-5 h-5', tb.isActive ? 'text-green-500' : 'text-gray-400')} />
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); toggleActive(tb) }} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200">
                        {tb.isActive ? tCommon('active') : tCommon('inactive')}
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(tb.id) }} className="p-1 hover:bg-red-50 rounded">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">{tb.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{tb.seats} seats</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-lg">{editTable ? t('editTable') : t('addTable')}</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('tableName')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('tableSection')}</label>
                  <input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('tableSeats')}</label>
                  <input type="number" value={form.seats} onChange={e => setForm(f => ({ ...f, seats: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
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