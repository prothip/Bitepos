'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { X, Smartphone, Copy, Check } from 'lucide-react'
import QRCode from 'qrcode'

interface PromptPayQRProps {
  amount: number
  onClose: () => void
}

function generatePromptPayPayload(phoneNumber: string, amount: number): string {
  // EMVCo QR for PromptPay (mock)
  const payload = [
    '000201',
    '010212',
    '2937',
    '0016A000000677010111',
    `0113${phoneNumber}`,
    '5303764',
    `5405${amount.toFixed(2)}`,
    '5802TH',
    '6304',
  ].join('')
  return payload + '1234'
}

export default function PromptPayQR({ amount, onClose }: PromptPayQRProps) {
  const t = useTranslations('pos')
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phoneNumber = '0812345678' // Mock - should come from settings

  useEffect(() => {
    const data = generatePromptPayPayload(phoneNumber, amount)
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, data, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).catch(() => {
        // Fallback: generate data URL
        QRCode.toDataURL(data, { width: 200, margin: 2 })
          .then(url => setQrUrl(url))
          .catch(() => {})
      })
    } else {
      QRCode.toDataURL(data, { width: 200, margin: 2 })
        .then(url => setQrUrl(url))
        .catch(() => {})
    }
  }, [amount])

  const qrData = generatePromptPayPayload(phoneNumber, amount)

  async function copyToClipboard() {
    await navigator.clipboard.writeText(qrData)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 bg-green-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            <h2 className="font-bold text-lg">PromptPay</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>

          <div>
            <p className="text-2xl font-bold text-gray-900">฿{amount.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Scan to pay with any banking app</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            ⚠️ Mock QR — configure your real PromptPay merchant ID in Settings.
          </div>

          <div className="flex gap-3">
            <button onClick={copyToClipboard} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy QR Data'}
            </button>
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}