'use client'

import { useState, useEffect } from 'react'
import { Building2, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveBranch } from '@/lib/use-active-branch'

export function BranchSwitcher() {
  const { branch, branches, switchBranch } = useActiveBranch()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open])

  if (branches.length <= 1) {
    return branch ? (
      <div className="flex items-center gap-1.5 text-sm text-gray-600 px-2 py-1 rounded-lg bg-gray-50">
        <Building2 className="w-3.5 h-3.5" />
        <span>{branch.name}</span>
      </div>
    ) : null
  }

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-gray-600 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <Building2 className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate">{branch?.name || 'Select'}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border z-50 py-1">
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => { switchBranch(b); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors',
                b.id === branch?.id && 'bg-orange-50 text-orange-700',
              )}
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{b.name}</span>
              {b.id === branch?.id && <Check className="w-3.5 h-3.5" />}
              {b.isMain && <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-600">★</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}