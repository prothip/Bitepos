import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import TrialBanner from '@/components/TrialBanner'
import '../globals.css'

const locales = ['en', 'my', 'zh', 'th']

export const metadata: Metadata = {
  title: 'BitePOS POS',
  description: 'Point of Sale System for BitePOS Restaurant',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon.png',
  },
}

interface RootLayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = params

  if (!locales.includes(locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={locale === 'my' ? 'font-myanmar' : ''}>
        <NextIntlClientProvider messages={messages}>
          <TrialBanner />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
