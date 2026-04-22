'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Edit2, Trash2, Search, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Customer {
  id: string; name: string; phone: string | null; email: string | null
  points: number; lifetimePoints: number; orders: Array<{ id: string }>; createdAt: string
}

export default function CustomersPage() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ name: '', phone: '', email: '', points: '0' })

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/customers')
      if (res.ok) setCustomers(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const filtered = customers.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.phone || '').includes(search) && !(c.email || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function openAdd() {
    setEditCustomer(null)
    setForm({ name: '', phone: '', email: '', points: '0' })
    setShowModal(true)
  }

  function openEdit(c: Customer) {
    setEditCustomer(c)
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', points: c.points.toString() })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = { ...form, points: parseInt(form.points) || 0, lifetimePoints: parseInt(form.points) || 0 }
      if (editCustomer) {
        await fetch(`/api/customers?id=${editCustomer.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setShowModal(false)
      fetchCustomers()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    await fetch(`/api/customers?id=${id}`, { method: 'DELETE' })
    fetchCustomers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('customers')}</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {t('addCustomer')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tCommon('search') + '...'} className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{tCommon('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('noData')}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">{tCommon('name')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">{t('customerPhone')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">{t('customerEmail')}</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">{t('customerPoints')}</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{c.email || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600">
                      <Award className="w-3.5 h-3.5" /> {c.points}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-gray-600">{c.orders?.length || 0}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-lg">{editCustomer ? t('editCustomer') : t('addCustomer')}</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('customerName')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('customerPhone')}</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('customerEmail')}</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('customerPoints')}</label>
                <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
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