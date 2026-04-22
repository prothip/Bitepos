'use client'

import { useState, useEffect, useCallback } from 'react'
import { validateLicense, activateLicense, clearLicense, getLicenseToken, mergeFeatures, type LicenseState } from '@/lib/license'

const TRIAL_DAYS = 15

export function useLicense() {
  const [state, setState] = useState<LicenseState>({
    valid: false, tier: null, features: null, expiresAt: null, error: null, code: null
  })
  const [checking, setChecking] = useState(true)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)

  const syncCookie = useCallback(() => {
    const token = getLicenseToken()
    if (token) {
      document.cookie = `bitepos_license_token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    } else {
      document.cookie = 'bitepos_license_token=; path=/; max-age=0'
    }
  }, [])

  useEffect(() => {
    checkLicense()
    const interval = setInterval(checkLicense, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const checkLicense = async () => {
    const token = getLicenseToken()

    if (token) {
      const result = await validateLicense()
      setState(result)
      setTrialDaysLeft(null)
      setChecking(false)
      syncCookie()
      return
    }

    // No license token — check trial via API (DB-backed)
    try {
      const res = await fetch('/api/license/trial')
      const data = await res.json()
      setTrialDaysLeft(data.daysLeft)

      if (data.isTrial) {
        setState({ valid: true, tier: 'trial', features: {}, expiresAt: null, error: null, code: 'TRIAL' })
      } else if (data.tier === 'expired') {
        setState({ valid: false, tier: null, features: null, expiresAt: null, error: 'Trial expired', code: 'TRIAL_EXPIRED' })
      } else if (data.tier === 'licensed') {
        setState({ valid: true, tier: 'licensed', features: null, expiresAt: null, error: null, code: null })
      } else {
        setState({ valid: false, tier: null, features: null, expiresAt: null, error: 'No license', code: 'NO_KEY' })
      }
    } catch {
      setState({ valid: false, tier: null, features: null, expiresAt: null, error: 'Network error', code: 'NO_KEY' })
    }
    setChecking(false)
    syncCookie()
  }

  const activate = async (key: string) => {
    const result = await activateLicense(key)
    setState(result)
    syncCookie()
    return result
  }

  const deactivate = () => {
    clearLicense()
    setState({ valid: false, tier: null, features: null, expiresAt: null, error: 'No license', code: 'NO_KEY' })
    syncCookie()
  }

  const mergeWithBusinessFeatures = (businessFeatures: Record<string, boolean>) => {
    if (state.code === 'TRIAL') {
      return businessFeatures
    }
    return mergeFeatures(state.features, businessFeatures)
  }

  const isTrial = state.code === 'TRIAL'

  return { ...state, checking, activate, deactivate, refresh: checkLicense, mergeWithBusinessFeatures, isTrial, trialDaysLeft }
}