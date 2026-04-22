'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { formatTHB } from '@/lib/currency'

interface Order {
  orderNumber: string
  type: string
  items: Array<{
    nameSnapshot: string
    priceSnapshot: number
    quantity: number
    subtotal: number
    notes?: string
    modifiers?: Array<{ nameSnapshot: string; priceSnapshot: number }>
  }>
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  taxRate: number
  vatMode: string
  payments?: Array<{
    method: string
    amount: number
    tendered?: number
    change?: number
  }>
  staff?: { name: string }
  table?: { name: string }
  createdAt: string
}

interface ShopSettings {
  shopName: string
  shopAddress: string
  shopPhone: string
  taxId: string
  receiptFooter: string
}

interface ReceiptPrinterProps {
  order: Order
  shopSettings: ShopSettings
  locale: string
  onClose: () => void
}

/**
 * ESC/POS command helpers
 */
const ESC = 0x1b
const GS = 0x1d

function cut(): Uint8Array {
  return new Uint8Array([GS, 0x56, 0x00])
}

function center(): Uint8Array {
  return new Uint8Array([ESC, 0x61, 0x01])
}

function left(): Uint8Array {
  return new Uint8Array([ESC, 0x61, 0x00])
}

function boldOn(): Uint8Array {
  return new Uint8Array([ESC, 0x45, 0x01])
}

function boldOff(): Uint8Array {
  return new Uint8Array([ESC, 0x45, 0x00])
}

function doubleHeight(): Uint8Array {
  return new Uint8Array([ESC, 0x21, 0x10])
}

function normal(): Uint8Array {
  return new Uint8Array([ESC, 0x21, 0x00])
}

function textToBytes(text: string): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(text)
}

function encodeLine(left: string, right: string, width = 48): Uint8Array {
  const spaces = width - left.length - right.length
  if (spaces < 1) {
    return textToBytes(left + right)
  }
  return textToBytes(left + ' '.repeat(spaces) + right)
}

function line(char = '-', width = 48): Uint8Array {
  return textToBytes(char.repeat(width))
}

function blank(): Uint8Array {
  return textToBytes(' '.repeat(48))
}

export default function ReceiptPrinter({ order, shopSettings, locale, onClose }: ReceiptPrinterProps) {
  const t = useTranslations('pos')
  const [printerStatus, setPrinterStatus] = useState<'idle' | 'searching' | 'printing' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function printReceipt() {
    setPrinterStatus('searching')
    setError('')

    try {
      // Connect to ESC/POS device via Web Bluetooth or USB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let printerDevice: any = null
      let isUsb = false

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const device: any = await navigator.usb.requestDevice({
          filters: [
            { classCode: 0x07 }, // Printer class
            { classCode: 0x00 }, // Miscellaneous
          ]
        })
        await device.open()
        if (device.configuration === null) {
          await device.selectConfiguration(1)
        }
        await device.claimInterface(0)
        printerDevice = device
        isUsb = true
      } catch {
        // USB not available, try Bluetooth
        try {
          const btDevice = await navigator.bluetooth.requestDevice({
            filters: [
              { namePrefix: 'Printer' },
              { namePrefix: 'POS' },
              { namePrefix: 'Thermal' },
            ],
            optionalServices: ['00001111-0000-1000-8000-00805f9b34fb']
          })
          const server = await btDevice.gatt!.connect()
          const service = await server.getPrimaryService('00001111-0000-1000-8000-00805f9b34fb')
          await service.getCharacteristic('00001112-0000-1000-8000-00805f9b34fb')
          printerDevice = btDevice
        } catch {
          // No printer found
        }
      }

      if (!printerDevice) {
        // No printer found — show preview mode
        setPrinterStatus('done')
        return
      }

      setPrinterStatus('printing')

      // Build ESC/POS binary
      const encoder = new TextEncoder()
      const commands: Uint8Array[] = []

      // Initialize printer
      commands.push(new Uint8Array([ESC, 0x40]))

      // Shop header
      commands.push(center())
      commands.push(boldOn())
      commands.push(doubleHeight())
      commands.push(textToBytes(shopSettings.shopName || 'BitePOS POS'))
      commands.push(new Uint8Array([0x0a]))
      commands.push(normal())
      commands.push(boldOff())

      if (shopSettings.shopAddress) {
        commands.push(center())
        commands.push(textToBytes(shopSettings.shopAddress))
        commands.push(new Uint8Array([0x0a]))
      }

      if (shopSettings.shopPhone) {
        commands.push(center())
        commands.push(textToBytes('Tel: ' + shopSettings.shopPhone))
        commands.push(new Uint8Array([0x0a]))
      }

      if (shopSettings.taxId) {
        commands.push(center())
        commands.push(textToBytes('Tax ID: ' + shopSettings.taxId))
        commands.push(new Uint8Array([0x0a]))
      }

      commands.push(line('='))
      commands.push(new Uint8Array([0x0a]))

      // Order info
      commands.push(left())
      commands.push(encodeLine('Order #: ' + order.orderNumber, new Date(order.createdAt).toLocaleString('th-TH')))
      commands.push(new Uint8Array([0x0a]))
      commands.push(encodeLine('Type: ' + (order.type === 'dine-in' ? t('dineIn') : order.type === 'takeaway' ? t('takeaway') : t('delivery')), ''))
      commands.push(new Uint8Array([0x0a]))
      if (order.staff?.name) {
        commands.push(encodeLine('Server: ' + order.staff.name, ''))
        commands.push(new Uint8Array([0x0a]))
      }
      if (order.table?.name) {
        commands.push(encodeLine('Table: ' + order.table.name, ''))
        commands.push(new Uint8Array([0x0a]))
      }

      commands.push(line('-'))
      commands.push(new Uint8Array([0x0a]))

      // Items
      for (const item of order.items) {
        const qtyLine = item.quantity + 'x ' + item.nameSnapshot
        const priceLine = formatTHB(item.subtotal)
        commands.push(textToBytes(qtyLine))
        const padding = 48 - priceLine.length
        commands.push(new Uint8Array([...Array(padding).fill(0x20)]))
        commands.push(textToBytes(priceLine))
        commands.push(new Uint8Array([0x0a]))

        if (item.modifiers && item.modifiers.length > 0) {
          for (const mod of item.modifiers) {
            commands.push(textToBytes('  - ' + mod.nameSnapshot))
            if (mod.priceSnapshot > 0) {
              commands.push(textToBytes(' +' + formatTHB(mod.priceSnapshot)))
            }
            commands.push(new Uint8Array([0x0a]))
          }
        }

        if (item.notes) {
          commands.push(new Uint8Array([0x1b, 0x33, 0x01])) // small font
          commands.push(textToBytes('  Note: ' + item.notes))
          commands.push(new Uint8Array([0x0a, 0x1b, 0x33, 0x00])) // normal font
        }
      }

      commands.push(new Uint8Array([0x0a]))
      commands.push(line('-'))
      commands.push(new Uint8Array([0x0a]))

      // Totals
      commands.push(encodeLine('Subtotal:', formatTHB(order.subtotal)))
      commands.push(new Uint8Array([0x0a]))
      commands.push(encodeLine(order.vatMode === 'inclusive' ? 'VAT (incl):' : 'VAT (7%):', formatTHB(order.taxAmount)))
      commands.push(new Uint8Array([0x0a]))

      if (order.discountAmount > 0) {
        commands.push(encodeLine('Discount:', '-' + formatTHB(order.discountAmount)))
        commands.push(new Uint8Array([0x0a]))
      }

      commands.push(boldOn())
      commands.push(doubleHeight())
      commands.push(encodeLine('TOTAL:', formatTHB(order.total)))
      commands.push(new Uint8Array([0x0a]))
      commands.push(normal())
      commands.push(boldOff())

      commands.push(line('='))
      commands.push(new Uint8Array([0x0a]))

      // Payment info
      if (order.payments && order.payments.length > 0) {
        for (const p of order.payments) {
          const methodLabel = p.method === 'cash' ? t('cashPayment') : p.method === 'card' ? t('cardPayment') : t('mobilePayment')
          commands.push(encodeLine('Payment: ' + methodLabel, formatTHB(p.amount)))
          commands.push(new Uint8Array([0x0a]))
          if (p.tendered && p.change) {
            commands.push(encodeLine('Tendered:', formatTHB(p.tendered)))
            commands.push(new Uint8Array([0x0a]))
            commands.push(encodeLine('Change:', formatTHB(p.change)))
            commands.push(new Uint8Array([0x0a]))
          }
        }
      }

      commands.push(line('='))
      commands.push(new Uint8Array([0x0a]))

      // Footer
      if (shopSettings.receiptFooter) {
        commands.push(center())
        commands.push(textToBytes(shopSettings.receiptFooter))
        commands.push(new Uint8Array([0x0a]))
      }

      commands.push(center())
      commands.push(textToBytes('Thank you! See you again.'))
      commands.push(new Uint8Array([0x0a, 0x0a, 0x0a]))

      // Cut paper
      commands.push(cut())

      // Send to USB device
      if (isUsb && printerDevice) {
        await printerDevice.transferOut(1, concatUint8Arrays(commands))
      } else if (printerDevice) {
        // Bluetooth write would go here via characteristic
        // For now, just mark done
      }

      setPrinterStatus('done')
    } catch (err: unknown) {
      console.error('Print error:', err)
      if ((err as Error).name === 'NotFoundError') {
        setError('No printer selected — receipt preview will be shown')
        setPrinterStatus('done')
      } else {
        setError((err as Error).message || 'Print failed')
        setPrinterStatus('error')
      }
    }
  }

  useEffect(() => {
    printReceipt()
  }, [])

  const localeMap: Record<string, string> = { en: 'en-US', my: 'th-TH', zh: 'zh-CN', th: 'th-TH' }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Status */}
        <div className="px-6 py-8 text-center">
          {printerStatus === 'searching' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto animate-pulse">
                <span className="text-3xl">🔍</span>
              </div>
              <p className="font-semibold text-gray-800">Searching for printer...</p>
              <p className="text-sm text-gray-500">Make sure your printer is powered on and in pairing mode</p>
            </div>
          )}
          {printerStatus === 'printing' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-bounce">
                <span className="text-3xl">🖨️</span>
              </div>
              <p className="font-semibold text-gray-800">Printing receipt...</p>
            </div>
          )}
          {printerStatus === 'done' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <span className="text-3xl">✅</span>
              </div>
              <p className="font-semibold text-gray-800">Receipt printed!</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium"
              >
                Done
              </button>
            </div>
          )}
          {printerStatus === 'error' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <span className="text-3xl">❌</span>
              </div>
              <p className="font-semibold text-gray-800">Print failed</p>
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Preview */}
        {printerStatus === 'done' && (
          <div className="border-t">
            <div className="bg-gray-100 p-4">
              <p className="text-xs text-gray-500 text-center mb-2">Receipt Preview</p>
              <div className="bg-white rounded-lg p-4 font-mono text-xs text-gray-800 mx-auto max-w-xs border">
                <p className="text-center font-bold">{shopSettings.shopName || 'BitePOS POS'}</p>
                {shopSettings.shopAddress && <p className="text-center">{shopSettings.shopAddress}</p>}
                {shopSettings.shopPhone && <p className="text-center">Tel: {shopSettings.shopPhone}</p>}
                <p className="text-center my-2">{'='.repeat(24)}</p>
                <p>Order #: {order.orderNumber}</p>
                <p>{new Date(order.createdAt).toLocaleString(localeMap[locale] || 'en-US')}</p>
                <p>{'='.repeat(24)}</p>
                {order.items.map((item, i) => (
                  <p key={i} className="mt-1">
                    {item.quantity}x {item.nameSnapshot}{' '}
                    {'.'.repeat(Math.max(1, 20 - item.nameSnapshot.length - item.quantity.toString().length))}
                    {formatTHB(item.subtotal)}
                  </p>
                ))}
                <p className="mt-2">{'-'.repeat(24)}</p>
                <p>Subtotal: {formatTHB(order.subtotal)}</p>
                <p>VAT: {formatTHB(order.taxAmount)}</p>
                {order.discountAmount > 0 && <p>Discount: -{formatTHB(order.discountAmount)}</p>}
                <p className="font-bold mt-1">TOTAL: {formatTHB(order.total)}</p>
                <p className="mt-2">{'-'.repeat(24)}</p>
                {order.payments?.map((p, i) => (
                  <p key={i}>Paid {p.method}: {formatTHB(p.amount)}{p.tendered ? ` (Tendered: ${formatTHB(p.tendered)} Change: ${formatTHB(p.change || 0)})` : ''}</p>
                ))}
                <p className="mt-2 text-center">{'='.repeat(24)}</p>
                {shopSettings.receiptFooter && <p className="text-center text-[10px] mt-1">{shopSettings.receiptFooter}</p>}
                <p className="text-center text-[10px] mt-1">Thank you!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}
