'use client'

import { useState, useEffect } from 'react'
import type { FeatureFlags } from '@/lib/business-types'
import { DEFAULT_FEATURES } from '@/lib/business-types'

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURES)
  const [loading, setLoading] = useState(true)
  const [businessType, setBusinessType] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/business-type')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setFlags(data.featureFlags)
          setBusinessType(data.businessType)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { flags, loading, businessType }
}