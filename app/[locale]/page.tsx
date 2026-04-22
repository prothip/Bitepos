'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const locale = window.location.pathname.split('/')[1] || 'en'
    fetch('/api/settings/business-type')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.businessType) {
          router.replace(`/${locale}/pos`)
        } else {
          router.replace(`/${locale}/onboarding`)
        }
      })
      .catch(() => {
        router.replace(`/${locale}/pos`)
      })
      .finally(() => setChecked(true))
  }, [router])

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">Loading BitePOS...</div>
      </div>
    )
  }

  return null
}