'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Save, Download, Upload, Store, Receipt, Percent } from 'lucide-react'
import UpdateChecker from '@/components/UpdateChecker'

interface SettingsMap {
  [key: string]: string
}

export default function SettingsPage() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        const map: SettingsMap = {}
        if (Array.isArray(data)) data.forEach((s: { key: string; value: string }) => { map[s.key] = s.value })
        setSettings(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  function handleExport() {
    const a = document.createElement('a')
    a.href = '/api/settings?action=export'
    a.download = `bitepos-backup-${new Date().toISOString().slice(0, 10)}.db`
    a.click()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('This will REPLACE your current database. Are you sure?')) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('database', file)
      const res = await fetch('/api/settings?action=import', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        alert('Database imported successfully! The page will reload.')
        window.location.reload()
      } else {
        const data = await res.json()
        alert('Import failed: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Import failed: Network error')
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">{tCommon('loading')}</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings')}</h1>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? tCommon('loading') : t('saveSettings')} {saved && '✓'}
        </button>
      </div>

      {/* Shop Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-gray-800">Shop Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">{t('shopName')}</label>
            <input value={settings.shopName || ''} onChange={e => set('shopName', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <input value={settings.shopAddress || ''} onChange={e => set('shopAddress', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input value={settings.shopPhone || ''} onChange={e => set('shopPhone', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tax ID</label>
              <input value={settings.taxId || ''} onChange={e => set('taxId', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Receipt */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-gray-800">Receipt Settings</h2>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">{t('receiptFooter')}</label>
          <textarea value={settings.receiptFooter || ''} onChange={e => set('receiptFooter', e.target.value)} rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* VAT */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-gray-800">VAT & Tax</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">{t('vatMode')}</label>
            <select value={settings.defaultVatMode || 'exclusive'} onChange={e => set('defaultVatMode', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
              <option value="exclusive">Exclusive</option>
              <option value="inclusive">Inclusive</option>
              <option value="none">No VAT</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t('taxRate')} (%)</label>
            <input type="number" value={settings.taxRate || '7'} onChange={e => set('taxRate', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Loyalty */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⭐</span>
          <h2 className="font-semibold text-gray-800">{t('loyaltySettings')}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">{t('pointsPerBaht')}</label>
            <input type="number" value={settings.pointsPerBaht || '1'} onChange={e => set('pointsPerBaht', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t('redeemRate')} (points = 1 ฿)</label>
            <input type="number" value={settings.redeemRate || '100'} onChange={e => set('redeemRate', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-gray-800">Data Backup</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:opacity-90">
            <Download className="w-4 h-4" /> Export Database
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium cursor-pointer hover:opacity-90">
            <Upload className="w-4 h-4" /> Import Database
            <input type="file" accept=".db,.sqlite" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>
      {/* Software Update (Electron only) */}
      <UpdateChecker />
    </div>
  )
}