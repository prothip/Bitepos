'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface KitchenOrder {
  orderNumber: string
  type: string
  table?: { name: string } | null
  items: Array<{
    nameSnapshot: string
    quantity: number
    notes?: string
    modifiers?: Array<{ nameSnapshot: string }>
  }>
  createdAt: string
  staff?: { name: string } | null
}

/**
 * ESC/POS command helpers for kitchen printer
 */
const ESC = 0x1b
const GS = 0x1d

function cut(): Uint8Array { return new Uint8Array([GS, 0x56, 0x00]) }
function center(): Uint8Array { return new Uint8Array([ESC, 0x61, 0x01]) }
function left(): Uint8Array { return new Uint8Array([ESC, 0x61, 0x00]) }
function boldOn(): Uint8Array { return new Uint8Array([ESC, 0x45, 0x01]) }
function boldOff(): Uint8Array { return new Uint8Array([ESC, 0x45, 0x00]) }
function doubleHeight(): Uint8Array { return new Uint8Array([ESC, 0x21, 0x10]) }
function underlineOn(): Uint8Array { return new Uint8Array([ESC, 0x2d, 0x01]) }
function underlineOff(): Uint8Array { return new Uint8Array([ESC, 0x2d, 0x00]) }
function normal(): Uint8Array { return new Uint8Array([ESC, 0x21, 0x00]) }
function textToBytes(text: string): Uint8Array { return new TextEncoder().encode(text) }
function line(char = '-', width = 48): Uint8Array { return textToBytes(char.repeat(width)) }
function blank(): Uint8Array { return textToBytes('\n') }

async function printToUSB(commands: Uint8Array[]): Promise<boolean> {
  try {
    const device = await navigator.usb.requestDevice({
      filters: [{ classCode: 0x07 }, { classCode: 0x00 }]
    })
    await device.open()
    if (device.configuration === null) await device.selectConfiguration(1)
    await device.claimInterface(0)
    const data = concatUint8Arrays(commands)
    await device.transferOut(1, data)
    await device.releaseInterface(0)
    await device.close()
    return true
  } catch {
    return false
  }
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length }
  return result
}

interface KitchenOrderPrinterProps {
  order: KitchenOrder
  onClose: () => void
}

export default function KitchenOrderPrinter({ order, onClose }: KitchenOrderPrinterProps) {
  const t = useTranslations('pos')
  const [status, setStatus] = useState<'idle' | 'searching' | 'printing' | 'done' | 'error' | 'preview'>('idle')
  const [error, setError] = useState('')

  async function handlePrint() {
    setStatus('searching')
    setError('')
    try {
      const commands = buildKitchenTicket()
      const ok = await printToUSB(commands)
      if (ok) {
        setStatus('printing')
        setTimeout(() => setStatus('done'), 1000)
      } else {
        setStatus('preview')
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Print failed')
      setStatus('error')
    }
  }

  function buildKitchenTicket(): Uint8Array[] {
    const commands: Uint8Array[] = []

    // Init
    commands.push(new Uint8Array([ESC, 0x40]))

    // Header - KITCHEN ORDER
    commands.push(center())
    commands.push(boldOn())
    commands.push(doubleHeight())
    commands.push(textToBytes('KITCHEN ORDER'))
    commands.push(new Uint8Array([0x0a]))
    commands.push(normal())
    commands.push(boldOff())

    // Order number - big and bold
    commands.push(center())
    commands.push(boldOn())
    commands.push(doubleHeight())
    commands.push(textToBytes('#' + order.orderNumber))
    commands.push(new Uint8Array([0x0a, 0x0a]))
    commands.push(normal())
    commands.push(boldOff())

    commands.push(line('='))
    commands.push(new Uint8Array([0x0a]))

    // Type & Table
    commands.push(left())
    commands.push(boldOn())
    const typeLabel = order.type === 'dine-in' ? 'DINE-IN' : order.type === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY'
    commands.push(textToBytes(typeLabel))
    if (order.table?.name) {
      commands.push(textToBytes('  |  TABLE: ' + order.table.name))
    }
    commands.push(new Uint8Array([0x0a]))
    commands.push(boldOff())

    // Time
    commands.push(textToBytes('Time: ' + new Date(order.createdAt).toLocaleTimeString('th-TH')))
    if (order.staff?.name) {
      commands.push(textToBytes('  Server: ' + order.staff.name))
    }
    commands.push(new Uint8Array([0x0a]))
    commands.push(line('='))
    commands.push(new Uint8Array([0x0a]))

    // Items - NO PRICES (kitchen doesn't need them)
    for (const item of order.items) {
      commands.push(boldOn())
      commands.push(textToBytes(`  ${item.quantity}x  ${item.nameSnapshot}`))
      commands.push(boldOff())
      commands.push(new Uint8Array([0x0a]))

      // Modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          commands.push(textToBytes(`       + ${mod.nameSnapshot}`))
          commands.push(new Uint8Array([0x0a]))
        }
      }

      // Notes - highlighted
      if (item.notes) {
        commands.push(underlineOn())
        commands.push(textToBytes(`       *** ${item.notes} ***`))
        commands.push(underlineOff())
        commands.push(new Uint8Array([0x0a]))
      }
    }

    commands.push(new Uint8Array([0x0a]))
    commands.push(line('='))
    commands.push(new Uint8Array([0x0a, 0x0a, 0x0a]))
    commands.push(cut())

    return commands
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b bg-orange-50">
          <h2 className="font-bold text-lg flex items-center gap-2">
            🧑‍🍳 Kitchen Order Printer
          </h2>
          <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
        </div>

        <div className="px-6 py-6">
          {status === 'idle' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                <span className="text-3xl">🖨️</span>
              </div>
              <p className="text-center text-gray-600">Print kitchen order ticket?</p>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs border-2 border-dashed border-gray-200">
                <p className="text-center font-bold text-sm">KITCHEN ORDER</p>
                <p className="text-center font-bold text-lg">#{order.orderNumber}</p>
                <p className="text-center">{order.type === 'dine-in' ? '🪑 DINE-IN' : order.type === 'takeaway' ? '📦 TAKEAWAY' : '🛵 DELIVERY'}
                  {order.table?.name && ` • Table ${order.table.name}`}</p>
                <div className="border-t border-dashed my-2"></div>
                {order.items.map((item, i) => (
                  <div key={i} className="mt-1">
                    <p className="font-bold">{item.quantity}x {item.nameSnapshot}</p>
                    {item.modifiers?.map((mod, j) => (
                      <p key={j} className="text-gray-600 ml-4">+ {mod.nameSnapshot}</p>
                    ))}
                    {item.notes && (
                      <p className="text-red-600 font-bold ml-4">*** {item.notes} ***</p>
                    )}
                  </div>
                ))}
                <div className="border-t border-dashed my-2"></div>
                <p className="text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700"
                >
                  🖨️ Print Kitchen Ticket
                </button>
              </div>
            </div>
          )}

          {status === 'searching' && (
            <div className="text-center space-y-3 py-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto animate-pulse">
                <span className="text-3xl">🔍</span>
              </div>
              <p className="font-semibold">Searching for kitchen printer...</p>
              <p className="text-sm text-gray-500">Connect your thermal printer via USB</p>
            </div>
          )}

          {status === 'printing' && (
            <div className="text-center space-y-3 py-8">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto animate-bounce">
                <span className="text-3xl">🖨️</span>
              </div>
              <p className="font-semibold">Printing kitchen ticket...</p>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center space-y-3 py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <span className="text-3xl">✅</span>
              </div>
              <p className="font-semibold text-green-700">Kitchen ticket printed!</p>
              <button onClick={onClose} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium">
                Done
              </button>
            </div>
          )}

          {status === 'preview' && (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="font-medium text-gray-700">No printer connected</p>
              <p className="text-sm text-gray-500">Kitchen order preview only</p>
              <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
                OK
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-3 py-8">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <span className="text-3xl">❌</span>
              </div>
              <p className="font-semibold text-red-700">Print failed</p>
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Use buildKitchenTicket from the component for auto-print scenarios
// Import KitchenOrderPrinter directly instead