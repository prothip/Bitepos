'use client'

import { useTranslations } from 'next-intl'
import { useLicense } from '@/lib/use-license'

export default function TrialBanner() {
  const { isTrial, trialDaysLeft } = useLicense()
  const t = useTranslations('trial')

  if (!isTrial) return null

  const days = trialDaysLeft ?? 0
  
  if (days <= 3) {
    return (
      <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
        <span>⚠️ {t('expiresIn', { days })}</span>
        <a href="/license" className="underline font-bold hover:text-red-100">{t('activateNow')} →</a>
      </div>
    )
  }

  return (
    <div className="bg-orange-500 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2">
      <span>🎉 {t('freeTrial', { days })}</span>
      <a href="/license" className="underline hover:text-orange-100">{t('enterLicense')}</a>
    </div>
  )
}