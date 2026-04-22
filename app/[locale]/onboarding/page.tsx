'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { BUSINESS_LABELS, getFeaturesForBusiness, type BusinessType } from '@/lib/business-types'
import { Check, ChevronRight, ChevronLeft, Sparkles, Shield } from 'lucide-react'

const businessTypes = Object.keys(BUSINESS_LABELS) as BusinessType[]

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<BusinessType | null>(null)
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [managerPin, setManagerPin] = useState('')
  const [shopName, setShopName] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'en'

  useEffect(() => {
    fetch('/api/settings/business-type')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.businessType) {
          setExisting(true)
          setSelected(data.businessType)
        }
      })
      .catch(() => {})
  }, [])

  const handleContinue = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await fetch('/api/settings/business-type', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType: selected }),
      })
      // Go to step 2 (PIN setup) for new setups
      if (!existing) {
        setStep(2)
      } else {
        router.push(`/${locale}/admin`)
      }
    } catch {
      setSaving(false)
    }
  }

  const handleFinish = async () => {
    if (!adminPin || adminPin.length < 4) { alert('Admin PIN must be at least 4 digits'); return }
    if (!shopName.trim()) { alert('Shop name is required'); return }
    setSaving(true)
    try {
      // Update shop name
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName: shopName.trim() }),
      })

      // Create/update admin staff with hashed PIN
      const staffRes = await fetch('/api/staff')
      const staffList = staffRes.ok ? await staffRes.json() : []
      const existingAdmin = staffList.find((s: any) => s.role === 'admin')

      if (existingAdmin) {
        // Update existing admin PIN
        await fetch(`/api/staff?id=${existingAdmin.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: adminPin, name: 'Admin' }),
        })
      } else {
        // Create admin staff
        await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Admin', email: 'admin@bitepos.local', pin: adminPin, role: 'admin', isActive: true }),
        })
      }

      // Create manager if PIN provided
      if (managerPin && managerPin.length >= 4) {
        const existingManager = staffList.find((s: any) => s.role === 'manager')
        if (existingManager) {
          await fetch(`/api/staff?id=${existingManager.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: managerPin }),
          })
        } else {
          await fetch('/api/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Manager', email: 'manager@bitepos.local', pin: managerPin, role: 'manager', isActive: true }),
          })
        }
      }

      router.push(`/${locale}/login`)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-orange-400' : 'text-green-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 1 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <span className="text-sm font-medium">Business Type</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-600" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 2 ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
              2
            </div>
            <span className="text-sm font-medium">Setup PINs</span>
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold">BP</span>
                </div>
                <span className="text-white font-bold text-xl">BitePOS</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {existing ? 'Change Your Business Type' : 'What Type of Business Do You Run?'}
              </h1>
              <p className="text-gray-400 text-lg">
                {existing
                  ? 'Changing your business type will reset feature flags to defaults.'
                  : 'We\'ll configure the right features for your business automatically.'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              {businessTypes.map(type => {
                const info = BUSINESS_LABELS[type]
                const features = getFeaturesForBusiness(type)
                const enabledCount = Object.values(features).filter(Boolean).length
                const isSelected = selected === type
                return (
                  <button key={type} onClick={() => setSelected(type)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${isSelected ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800'}`}>
                    {isSelected && <div className="absolute top-2 right-2"><div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div></div>}
                    <div className="text-3xl mb-2">{info.icon}</div>
                    <div className="text-white font-semibold text-sm mb-0.5">{info.en}</div>
                    <div className="text-gray-400 text-xs mb-1">{info.th}</div>
                    <div className="text-gray-500 text-xs leading-tight line-clamp-2">{info.description}</div>
                    <div className="mt-2 text-xs text-orange-400 font-medium"><Sparkles className="w-3 h-3 inline mr-1" />{enabledCount} features</div>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-center">
              <button onClick={handleContinue} disabled={!selected || saving}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-lg transition-all ${selected ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                {saving ? 'Saving...' : existing ? 'Update Business Type' : 'Continue'}
                {!saving && <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Set Up Your PINs</h1>
                <p className="text-gray-400">These PINs unlock the app. Choose something only you know.</p>
              </div>

              <div className="bg-gray-800/80 rounded-2xl p-6 space-y-5 border border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Shop Name *</label>
                  <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="e.g. Somsak Restaurant"
                    className="w-full border border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Admin PIN * <span className="text-gray-500 font-normal">(full access)</span></label>
                  <input type="password" value={adminPin} onChange={e => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="4-6 digits" maxLength={6}
                    className="w-full border border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 outline-none text-center text-xl tracking-widest" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Manager PIN <span className="text-gray-500 font-normal">(optional, admin panel access)</span></label>
                  <input type="password" value={managerPin} onChange={e => setManagerPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="4-6 digits" maxLength={6}
                    className="w-full border border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 outline-none text-center text-xl tracking-widest" />
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-xs text-yellow-300">⚠️ Remember these PINs! They cannot be recovered if lost. Write them down somewhere safe.</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-between">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-gray-300 hover:bg-gray-800 transition-colors">
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button onClick={handleFinish} disabled={saving || !adminPin || adminPin.length < 4 || !shopName.trim()}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-lg transition-all ${adminPin.length >= 4 && shopName.trim() ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                  {saving ? 'Setting up...' : 'Start Using BitePOS'}
                  {!saving && <ChevronRight className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}