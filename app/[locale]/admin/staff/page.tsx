'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Edit2, Trash2, UserCheck, Shield, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Staff {
  id: string; name: string; email: string | null; pin: string; role: string; isActive: boolean
}

const ROLE_ICONS: Record<string, typeof Shield> = { admin: Shield, manager: Store, cashier: UserCheck }
const ROLE_COLORS: Record<string, string> = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', cashier: 'bg-green-100 text-green-700' }

export default function StaffPage() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editStaff, setEditStaff] = useState<Staff | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterRole, setFilterRole] = useState('all')

  const [form, setForm] = useState({ name: '', email: '', pin: '', role: 'cashier', isActive: true })

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staff')
      if (res.ok) setStaff(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const filtered = staff.filter(s => filterRole === 'all' || s.role === filterRole)

  function openAdd() {
    setEditStaff(null)
    setForm({ name: '', email: '', pin: '', role: 'cashier', isActive: true })
    setShowModal(true)
  }

  function openEdit(s: Staff) {
    setEditStaff(s)
    setForm({ name: s.name, email: s.email || '', pin: '', role: s.role, isActive: s.isActive })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name: form.name, email: form.email || null, role: form.role, isActive: form.isActive }
      if (form.pin) body.pin = form.pin
      if (editStaff) {
        await fetch(`/api/staff?id=${editStaff.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        if (!form.pin) { alert('PIN is required for new staff'); setSaving(false); return }
        body.pin = form.pin
        await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setShowModal(false)
      fetchStaff()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    await fetch(`/api/staff?id=${id}`, { method: 'DELETE' })
    fetchStaff()
  }

  async function toggleActive(s: Staff) {
    await fetch(`/api/staff?id=${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !s.isActive }) })
    fetchStaff()
  }

  const roleLabel: Record<string, string> = { admin: t('adminRole'), manager: t('manager'), cashier: t('cashier') }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('staff')}</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {t('addStaff')}
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'admin', 'manager', 'cashier'].map(r => (
          <button key={r} onClick={() => setFilterRole(r)}
            className={cn('px-3 py-2 rounded-xl text-sm font-medium', filterRole === r ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50')}>
            {r === 'all' ? tCommon('all') : roleLabel[r]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{tCommon('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('noData')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const Icon = ROLE_ICONS[s.role] || UserCheck
            return (
              <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', ROLE_COLORS[s.role] || 'bg-gray-100')}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.email || '—'}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[s.role])}>{roleLabel[s.role]}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={() => toggleActive(s)} className={cn('text-xs px-2 py-0.5 rounded-full', s.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500')}>
                    {s.isActive ? tCommon('active') : tCommon('inactive')}
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-lg">{editStaff ? t('editStaff') : t('addStaff')}</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('staffName')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('staffEmail')}</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('staffPin')} {editStaff && <span className="text-gray-400">(leave blank to keep current)</span>}</label>
                <input type="password" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} maxLength={6} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('staffRole')}</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="cashier">{t('cashier')}</option>
                  <option value="manager">{t('manager')}</option>
                  <option value="admin">{t('adminRole')}</option>
                </select>
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