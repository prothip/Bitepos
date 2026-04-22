'use client'

import { useTranslations } from 'next-intl'
import { VatMode } from '@/lib/tax'
import { cn } from '@/lib/utils'

interface VatToggleProps {
  vatMode: VatMode
  onToggle: (mode: VatMode) => void
}

export default function VatToggle({ vatMode, onToggle }: VatToggleProps) {
  const t = useTranslations('pos')

  const modes: { key: VatMode; label: string }[] = [
    { key: 'exclusive', label: t('vatExclusive') },
    { key: 'inclusive', label: t('vatInclusive') },
    { key: 'none', label: t('vatNone') },
  ]

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {modes.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            vatMode === key
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}