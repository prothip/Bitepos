'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const LOCALES = [
  { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭', name: 'Thai' },
  { code: 'my', label: 'မြန်မာ', flag: '🇲🇲', name: 'Myanmar' },
  { code: 'zh', label: '中文', flag: '🇨🇳', name: 'Chinese' },
]

const LOCALE_COOKIE = 'NEXT_LOCALE'

export default function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [currentLocale, setCurrentLocale] = useState('en')

  useEffect(() => {
    // Get locale from pathname or cookie
    const pathLocale = pathname.split('/')[1]
    if (LOCALES.find(l => l.code === pathLocale)) {
      setCurrentLocale(pathLocale)
    } else {
      const cookieLocale = getCookie(LOCALE_COOKIE)
      if (cookieLocale && LOCALES.find(l => l.code === cookieLocale)) {
        setCurrentLocale(cookieLocale)
      }
    }
  }, [pathname])

  function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? match[2] : null
  }

  function setCookie(name: string, value: string, days: number = 365) {
    if (typeof document === 'undefined') return
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
  }

  function switchLocale(locale: string) {
    setCurrentLocale(locale)
    setIsOpen(false)

    // Save to localStorage and cookie
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLocale', locale)
    }
    setCookie(LOCALE_COOKIE, locale)

    // Navigate to new locale path
    const segments = pathname.split('/')
    if (LOCALES.find(l => l.code === segments[1])) {
      segments[1] = locale
    } else {
      segments.splice(1, 0, locale)
    }

    router.push(segments.join('/'))
  }

  const current = LOCALES.find(l => l.code === currentLocale) || LOCALES[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <Globe className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg border py-1.5 z-50 min-w-[150px]">
            {LOCALES.map((locale) => (
              <button
                key={locale.code}
                onClick={() => switchLocale(locale.code)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors',
                  currentLocale === locale.code && 'bg-primary/5 text-primary font-medium'
                )}
              >
                <span className="text-base">{locale.flag}</span>
                <div className="text-left">
                  <p className="font-medium">{locale.label}</p>
                  <p className="text-xs text-gray-400">{locale.name}</p>
                </div>
                {currentLocale === locale.code && (
                  <span className="ml-auto text-primary text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
