'use client'

import { useState, useEffect, useCallback } from 'react'

interface Branch {
  id: string
  name: string
  slug: string
  isMain: boolean
  isActive: boolean
}

const STORAGE_KEY = 'bitepos-active-branch'

export function useActiveBranch() {
  const [branch, setBranch] = useState<Branch | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch('/api/branches')
      if (res.ok) {
        const data: Branch[] = await res.json()
        const active = data.filter((b: Branch) => b.isActive)
        setBranches(active)

        const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        const match = savedId ? active.find((b: Branch) => b.id === savedId) : null
        setBranch(match || active.find((b: Branch) => b.isMain) || active[0] || null)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchBranches() }, [fetchBranches])

  // Listen for branch changes from BranchSwitcher
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<Branch>
      setBranch(customEvent.detail)
    }
    window.addEventListener('branch-change', handler)
    return () => window.removeEventListener('branch-change', handler)
  }, [])

  const switchBranch = useCallback((b: Branch) => {
    setBranch(b)
    localStorage.setItem(STORAGE_KEY, b.id)
    window.dispatchEvent(new CustomEvent('branch-change', { detail: b }))
  }, [])

  return { branch, branches, switchBranch, loading }
}