'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const t = useTranslations('pos')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const { locale } = useParams() as { locale: string }

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'pin' | 'admin'>('pin')

  const pinPad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  function handlePinInput(val: string) {
    if (val === 'del') {
      setPin((prev) => prev.slice(0, -1))
      setError('')
      return
    }
    if (pin.length >= 6) return
    const newPin = pin + val
    setPin(newPin)

    if (newPin.length >= 4) {
      submitPin(newPin)
    }
  }

  async function submitPin(pinValue: string) {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.role === 'admin' || data.role === 'manager') {
          router.push(`/${locale}/admin`)
        } else {
          router.push(`/${locale}/pos`)
        }
      } else {
        setError(tErrors('invalidPin'))
        setPin('')
      }
    } catch {
      setError(tErrors('networkError'))
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-3">
            <span className="text-white font-bold text-2xl">BP</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">BitePOS POS</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'pin' ? t('enterPin') : 'Admin Login'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setMode('pin'); setPin(''); setError('') }}
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              mode === 'pin' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            )}
          >
            {t('staffPin')}
          </button>
          <button
            onClick={() => { setMode('admin'); setPin(''); setError('') }}
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              mode === 'admin' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            )}
          >
            Admin
          </button>
        </div>

        {mode === 'pin' ? (
          <>
            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all',
                    i < pin.length
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200'
                  )}
                >
                  {i < pin.length && (
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-3">
              {pinPad.map((val, idx) => (
                <button
                  key={idx}
                  onClick={() => val && handlePinInput(val)}
                  disabled={loading || !val}
                  className={cn(
                    'h-14 rounded-xl font-semibold text-xl transition-all',
                    !val ? 'invisible' : val === 'del'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                      : 'bg-gray-50 hover:bg-primary/10 hover:text-primary active:scale-95 active:bg-primary/20',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {val === 'del' ? <Delete className="w-5 h-5 mx-auto" /> : val}
                </button>
              ))}
            </div>
          </>
        ) : (
          <AdminLoginForm locale={locale} />
        )}
      </div>
    </div>
  )
}

function AdminLoginForm({ locale }: { locale: string }) {
  const router = useRouter()
  const tErrors = useTranslations('errors')
  const tCommon = useTranslations('common')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        router.push(`/${locale}/admin`)
      } else {
        setError('Invalid credentials')
      }
    } catch {
      setError(tErrors('networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-gray-600 mb-1 block">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="admin@bitepos.com"
          required
        />
      </div>
      <div>
        <label className="text-sm text-gray-600 mb-1 block">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="••••••••"
          required
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? tCommon('loading') : tCommon('login')}
      </button>
    </form>
  )
}
