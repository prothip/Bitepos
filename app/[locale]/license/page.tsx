'use client'

import { useState, useEffect } from 'react'
import { activateLicense, clearLicense } from '@/lib/license'

export default function LicensePage() {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [trialInfo, setTrialInfo] = useState<{ daysLeft: number; expired: boolean } | null>(null)

  useEffect(() => {
    // Check trial status
    const params = new URLSearchParams(window.location.search)
    if (params.get('trial') === 'expired') {
      setTrialInfo({ daysLeft: 0, expired: true })
    } else {
      // Try to read trial cookie
      const cookies = document.cookie.split(';').reduce((acc, c) => {
        const [k, v] = c.trim().split('=')
        acc[k] = v
        return acc
      }, {} as Record<string, string>)
      
      const trialStart = cookies['bitepos_trial_start']
      if (trialStart) {
        const startDate = new Date(trialStart)
        const now = new Date()
        const daysUsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const daysLeft = 15 - daysUsed
        setTrialInfo({ daysLeft: Math.max(0, daysLeft), expired: daysLeft <= 0 })
      }
    }
  }, [])

  const handleActivate = async () => {
    if (!key.trim()) return
    setLoading(true)
    setResult(null)
    const state = await activateLicense(key.trim())
    setResult({
      success: state.valid,
      message: state.valid
        ? `✅ Activated! Tier: ${state.tier}${state.expiresAt ? ` — Expires: ${new Date(state.expiresAt).toLocaleDateString()}` : ' — No expiry'}`
        : `❌ ${state.error}`,
    })
    setLoading(false)
    if (state.valid) {
      setTimeout(() => window.location.href = '/', 1500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{trialInfo?.expired ? '🔒' : '🔑'}</div>
          <h1 className="text-xl font-bold text-gray-900">
            {trialInfo?.expired ? 'Trial Expired' : 'Activate BitePOS'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {trialInfo?.expired 
              ? 'Your 15-day trial has ended. Enter a license key to continue.'
              : 'Enter your license key to activate'}
          </p>
        </div>

        {/* Trial Banner */}
        {trialInfo && !trialInfo.expired && trialInfo.daysLeft > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-center">
            <div className="text-sm font-medium text-orange-800">
              🎉 Free Trial — {trialInfo.daysLeft} day{trialInfo.daysLeft !== 1 ? 's' : ''} remaining
            </div>
            <div className="text-xs text-orange-600 mt-1">
              No license key needed during trial. Activate anytime to unlock permanently.
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              Continue with Trial
            </button>
          </div>
        )}

        {/* Expired Banner */}
        {trialInfo?.expired && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
            <div className="text-sm font-medium text-red-800">
              ⚠️ Your 15-day trial has expired
            </div>
            <div className="text-xs text-red-600 mt-1">
              Enter a license key below to continue using BitePOS.
            </div>
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="BPOS-XXXXXXXXXXXX"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            onKeyDown={e => e.key === 'Enter' && handleActivate()}
          />

          <button
            onClick={handleActivate}
            disabled={loading || !key.trim()}
            className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Activating...' : 'Activate License'}
          </button>

          {result && (
            <div className={`p-3 rounded-xl text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {result.message}
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <div className="text-center text-xs text-gray-400">
              <p className="font-medium text-gray-500 mb-1">Pricing Plans</p>
              <div className="flex justify-center gap-4">
                <span>Basic — ฿499/mo</span>
                <span>Pro — ฿999/mo</span>
                <span>Enterprise — ฿1,999/mo</span>
              </div>
            </div>
            <button
              onClick={() => { clearLicense(); setKey(''); setResult(null) }}
              className="mt-3 w-full text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Deactivate current license
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}