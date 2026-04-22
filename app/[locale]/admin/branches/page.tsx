'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Edit2, Trash2, Building2, Star, Globe, Phone, Mail, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Branch {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  email: string | null
  timezone: string
  isMain: boolean
  isActive: boolean
  taxRate: number
  createdAt: string
  _count?: { orders: number; staff: number; tables: number }
}

export default function BranchesPage() {
  const t = useTranslations('admin')
  const tBranch = useTranslations('branches')
  const tCommon = useTranslations('common')

  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '', slug: '', address: '', phone: '', email: '',
    timezone: 'Asia/Bangkok', taxRate: 7, isMain: false, isActive: true,
  })

  const fetchBranches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/branches')
      if (res.ok) {
        const data = await res.json()
        setBranches(data)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchBranches() }, [fetchBranches])

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  function openAdd() {
    setEditBranch(null)
    setForm({ name: '', slug: '', address: '', phone: '', email: '', timezone: 'Asia/Bangkok', taxRate: 7, isMain: false, isActive: true })
    setShowModal(true)
  }

  function openEdit(b: Branch) {
    setEditBranch(b)
    setForm({
      name: b.name, slug: b.slug, address: b.address || '', phone: b.phone || '',
      email: b.email || '', timezone: b.timezone, taxRate: b.taxRate, isMain: b.isMain, isActive: b.isActive,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    try {
      const body = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        timezone: form.timezone,
        taxRate: form.taxRate,
        isMain: form.isMain,
        isActive: form.isActive,
      }

      if (editBranch) {
        await fetch(`/api/branches/${editBranch.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/branches', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      }
      setShowModal(false)
      fetchBranches()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' })
    if (res.ok) fetchBranches()
    else {
      const data = await res.json()
      alert(data.error || tBranch('deleteError'))
    }
  }

  async function toggleActive(b: Branch) {
    if (b.isMain && b.isActive) return // can't deactivate main
    await fetch(`/api/branches/${b.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !b.isActive }),
    })
    fetchBranches()
  }

  async function setMain(b: Branch) {
    if (b.isMain) return
    if (!confirm(tBranch('setMainConfirm'))) return
    // Unset current main first
    const currentMain = branches.find(br => br.isMain)
    if (currentMain) {
      await fetch(`/api/branches/${currentMain.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMain: false }),
      })
    }
    await fetch(`/api/branches/${b.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMain: true }),
    })
    fetchBranches()
  }

  const timezones = ['Asia/Bangkok', 'Asia/Yangon', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Kolkata', 'UTC']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{tBranch('title')}</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {tBranch('addBranch')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{tCommon('loading')}</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{tBranch('noBranches')}</p>
          <button onClick={openAdd} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">
            {tBranch('addBranch')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => (
            <div key={b.id} className={cn(
              'bg-white rounded-xl p-5 shadow-sm border-2 transition-colors',
              b.isMain ? 'border-orange-300' : b.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60',
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    b.isMain ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600',
                  )}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{b.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {b.isMain && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium flex items-center gap-1">
                      <Star className="w-3 h-3" /> {tBranch('main')}
                    </span>
                  )}
                  <button onClick={() => !b.isMain && setMain(b)} disabled={b.isMain}
                    className={cn('p-1 rounded-lg', b.isMain ? 'cursor-not-allowed' : 'hover:bg-orange-50')}
                    title={tBranch('setMain')}>
                    <Star className={cn('w-4 h-4', b.isMain ? 'text-orange-500 fill-orange-500' : 'text-gray-300')} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-500 mb-3">
                {b.address && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{b.address}</span></div>}
                {b.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 flex-shrink-0" />{b.phone}</div>}
                {b.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{b.email}</span></div>}
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 flex-shrink-0" />{b.timezone}</div>
                <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 flex-shrink-0" />{tBranch('taxRate')}: {b.taxRate}%</div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button onClick={() => toggleActive(b)} disabled={b.isMain && b.isActive}
                  className={cn('text-xs px-2.5 py-1 rounded-full font-medium',
                    b.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500',
                    b.isMain && b.isActive && 'cursor-not-allowed opacity-50',
                  )}>
                  {b.isActive ? tCommon('active') : tCommon('inactive')}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  {!b.isMain && (
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-lg">{editBranch ? tBranch('editBranch') : tBranch('addBranch')}</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{tBranch('branchName')} *</label>
                <input value={form.name} onChange={e => {
                  const name = e.target.value
                  setForm(f => ({ ...f, name, slug: f.slug || slugify(name) }))
                }} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Main Branch" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{tBranch('branchSlug')}</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder={tBranch('branchSlugPlaceholder')} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{tBranch('address')}</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">{tBranch('phone')}</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{tBranch('email')}</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">{tBranch('timezone')}</label>
                  <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                    {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{tBranch('taxRate')} (%)</label>
                  <input type="number" step="0.1" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isMain} onChange={e => setForm(f => ({ ...f, isMain: e.target.checked }))} disabled={editBranch?.isMain} />
                  {tBranch('main')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  {tCommon('active')}
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm">{tCommon('cancel')}</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? tCommon('loading') : tCommon('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}