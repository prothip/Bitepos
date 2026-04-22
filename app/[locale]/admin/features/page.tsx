'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  BUSINESS_LABELS,
  FEATURE_LABELS,
  getFeaturesForBusiness,
  DEFAULT_FEATURES,
  type BusinessType,
  type FeatureFlags,
} from '@/lib/business-types'
import { ArrowLeft, RotateCcw, Settings2, Sparkles } from 'lucide-react'
import Link from 'next/link'

const groups = ['Dining', 'Inventory', 'Products', 'Sales', 'Customer', 'Kitchen', 'Reporting']

export default function FeaturesPage() {
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURES)
  const [baseFlags, setBaseFlags] = useState<FeatureFlags>(DEFAULT_FEATURES)
  const [overrides, setOverrides] = useState<Partial<FeatureFlags>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'en'

  useEffect(() => {
    fetch('/api/settings/business-type')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setBusinessType(data.businessType)
          setFeatureFlags(data.featureFlags)
          setBaseFlags(data.businessType ? getFeaturesForBusiness(data.businessType) : DEFAULT_FEATURES)
          setOverrides(data.overrides || {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleFeature = (key: keyof FeatureFlags) => {
    const newVal = !featureFlags[key]
    const newFlags = { ...featureFlags, [key]: newVal }
    const newOverrides: Partial<FeatureFlags> = {}

    // Track overrides: only store when different from base
    for (const k of Object.keys(newFlags) as (keyof FeatureFlags)[]) {
      if (newFlags[k] !== baseFlags[k]) {
        newOverrides[k] = newFlags[k]
      }
    }

    setFeatureFlags(newFlags)
    setOverrides(newOverrides)
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings/business-type', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  const resetOverrides = async () => {
    if (!businessType) return
    const defaults = getFeaturesForBusiness(businessType)
    setFeatureFlags(defaults)
    setOverrides({})
    setSaved(false)
    setSaving(true)
    try {
      await fetch('/api/settings/business-type', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: {} }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-gray-500">Loading feature flags...</div>

  const hasOverrides = Object.keys(overrides).length > 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
            {businessType ? (
              <p className="text-gray-500 text-sm">
                {BUSINESS_LABELS[businessType].icon} {BUSINESS_LABELS[businessType].en}
                <span className="ml-2 text-gray-400">({BUSINESS_LABELS[businessType].th})</span>
              </p>
            ) : (
              <p className="text-gray-500 text-sm">
                No business type set —{' '}
                <Link href={`/${locale}/onboarding`} className="text-orange-500 hover:underline">
                  choose one first
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasOverrides && (
            <button
              onClick={resetOverrides}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Feature Groups */}
      <div className="space-y-6">
        {groups.map(group => {
          const groupFeatures = Object.entries(FEATURE_LABELS)
            .filter(([, meta]) => meta.group === group) as [keyof FeatureFlags, { label: string; group: string }][]

          if (groupFeatures.length === 0) return null

          return (
            <div key={group} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b">
                <h2 className="font-semibold text-gray-700">{group}</h2>
              </div>
              <div className="divide-y">
                {groupFeatures.map(([key, meta]) => {
                  const isOn = featureFlags[key]
                  const isOverridden = key in overrides

                  return (
                    <div key={key} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-800">{meta.label}</span>
                        {isOverridden && (
                          <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-600 rounded font-medium">
                            override
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleFeature(key)}
                        className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
                          isOn ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            isOn ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-2 bg-gray-50 text-xs text-gray-400">
                <Sparkles className="w-3 h-3 inline mr-1" />
                {groupFeatures.filter(([k]) => featureFlags[k]).length}/{groupFeatures.length} enabled
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}