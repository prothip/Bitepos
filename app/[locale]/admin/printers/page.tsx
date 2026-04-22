'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Printer, Receipt, ChefHat, FileText, RefreshCw, Check, X, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PrinterConfig {
  id: string
  name: string
  type: 'receipt' | 'kitchen' | 'report'
  connection: 'usb' | 'bluetooth' | 'network' | 'windows'
  address: string
  paperWidth: 58 | 80 | 'A4'
  autoPrint: boolean
  copies: number
  enabled: boolean
}

const DEFAULT_PRINTERS: PrinterConfig[] = [
  { id: 'receipt', name: 'Receipt Printer', type: 'receipt', connection: 'usb', address: '', paperWidth: 80, autoPrint: true, copies: 1, enabled: true },
  { id: 'kitchen', name: 'Kitchen Printer', type: 'kitchen', connection: 'usb', address: '', paperWidth: 80, autoPrint: true, copies: 2, enabled: true },
  { id: 'report', name: 'Report Printer', type: 'report', connection: 'windows', address: '', paperWidth: 'A4' as 58 | 80 | 'A4', autoPrint: false, copies: 1, enabled: false },
]

export default function PrinterSettings() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const [printers, setPrinters] = useState<PrinterConfig[]>(DEFAULT_PRINTERS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [usbDevices, setUsbDevices] = useState<Array<{ name: string; vendorId: number; productId: number }>>([])

  useEffect(() => {
    // Load saved printer config from settings API
    loadPrinterSettings()
  }, [])

  async function loadPrinterSettings() {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const settings = await res.json()
        const printerJson = settings.find((s: any) => s.key === 'printerConfig')
        if (printerJson?.value) {
          const saved = JSON.parse(printerJson.value)
          setPrinters(saved)
        }
      }
    } catch {}
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerConfig: JSON.stringify(printers) }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function updatePrinter(id: string, updates: Partial<PrinterConfig>) {
    setPrinters(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  async function discoverUSB() {
    setDiscovering(true)
    try {
      // getDevices() requires prior permission, so we use requestDevice to discover
      const device = await (navigator as any).usb?.getDevices?.() || []
      setUsbDevices(device.map((d: any) => ({
        name: d.productName || 'Unknown Device',
        vendorId: d.vendorId,
        productId: d.productId,
      })))
    } catch {
      setUsbDevices([])
    } finally {
      setDiscovering(false)
    }
  }

  async function testPrint(id: string) {
    setTesting(id)
    const printer = printers.find(p => p.id === id)
    if (!printer) { setTesting(null); return }

    try {
      if (printer.connection === 'usb') {
        const device = await navigator.usb.requestDevice({
          filters: [{ classCode: 0x07 }, { classCode: 0x00 }]
        })
        await device.open()
        if (device.configuration === null) await device.selectConfiguration(1)
        await device.claimInterface(0)

        // Print test pattern
        const ESC = 0x1b
        const encoder = new TextEncoder()
        const testMsg = [
          new Uint8Array([ESC, 0x40]), // init
          encoder.encode('\n*** TEST PRINT ***\n'),
          encoder.encode(`Printer: ${printer.name}\n`),
          encoder.encode(`Paper: ${printer.paperWidth}mm\n`),
          encoder.encode(`Type: ${printer.type}\n`),
          encoder.encode(`Connection: ${printer.connection}\n`),
          encoder.encode('\nPrint test OK! ✅\n\n\n'),
        ]
        const data = new Uint8Array(testMsg.reduce((sum, a) => sum + a.length, 0))
        let offset = 0
        for (const arr of testMsg) { data.set(arr, offset); offset += arr.length }
        await device.transferOut(1, data)
        await device.releaseInterface(0)
        await device.close()
      } else if (printer.connection === 'windows') {
        // Electron uses window.print() or silent print
        window.print()
      }
    } catch (err) {
      console.error('Test print failed:', err)
    } finally {
      setTesting(null)
    }
  }

  const typeIcons = {
    receipt: Receipt,
    kitchen: ChefHat,
    report: FileText,
  }

  const typeColors = {
    receipt: 'bg-blue-50 border-blue-200 text-blue-700',
    kitchen: 'bg-orange-50 border-orange-200 text-orange-700',
    report: 'bg-purple-50 border-purple-200 text-purple-700',
  }

  const typeLabels = {
    receipt: '🧾 Receipt',
    kitchen: '🧑‍🍳 Kitchen',
    report: '📊 Report',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Printer className="w-7 h-7" /> Printer Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">Configure printers for receipts, kitchen orders, and reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={discoverUSB}
            disabled={discovering}
            className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', discovering && 'animate-spin')} /> Discover USB
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* USB Devices Found */}
      {usbDevices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">USB Devices Found</h3>
          <div className="space-y-1">
            {usbDevices.map((d, i) => (
              <p key={i} className="text-xs text-blue-600">
                • {d.name} (VID:{d.vendorId.toString(16)} PID:{d.productId.toString(16)})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Printer Cards */}
      <div className="grid gap-6">
        {printers.map((printer) => {
          const Icon = typeIcons[printer.type]
          const colorClass = typeColors[printer.type]

          return (
            <div key={printer.id} className={cn(
              'rounded-2xl border-2 p-6 transition-all',
              printer.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-70'
            )}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colorClass)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{printer.name}</h3>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorClass)}>
                      {typeLabels[printer.type]}
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-500">{printer.enabled ? 'Enabled' : 'Disabled'}</span>
                  <div
                    onClick={() => updatePrinter(printer.id, { enabled: !printer.enabled })}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                      printer.enabled ? 'bg-primary' : 'bg-gray-300'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform',
                      printer.enabled ? 'translate-x-5.5 left-0' : 'left-0.5'
                    )} style={{ left: printer.enabled ? '22px' : '2px' }} />
                  </div>
                </label>
              </div>

              {printer.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Connection Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Connection</label>
                    <select
                      value={printer.connection}
                      onChange={e => updatePrinter(printer.id, { connection: e.target.value as PrinterConfig['connection'] })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="usb">USB (Thermal)</option>
                      <option value="bluetooth">Bluetooth</option>
                      <option value="network">Network (IP)</option>
                      <option value="windows">Windows Printer</option>
                    </select>
                  </div>

                  {/* Address (for network) */}
                  {printer.connection === 'network' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">IP Address</label>
                      <input
                        type="text"
                        value={printer.address}
                        onChange={e => updatePrinter(printer.id, { address: e.target.value })}
                        placeholder="192.168.1.100:9100"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  {printer.connection === 'bluetooth' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Device Name</label>
                      <input
                        type="text"
                        value={printer.address}
                        onChange={e => updatePrinter(printer.id, { address: e.target.value })}
                        placeholder="POS-58 or Thermal Printer"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  {printer.connection === 'windows' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Windows Printer Name</label>
                      <input
                        type="text"
                        value={printer.address}
                        onChange={e => updatePrinter(printer.id, { address: e.target.value })}
                        placeholder="EPSON TM-T82X or leave blank for default"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  {/* Paper Width */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Paper Width</label>
                    <select
                      value={printer.paperWidth}
                      onChange={e => updatePrinter(printer.id, { paperWidth: e.target.value === 'A4' ? 'A4' : parseInt(e.target.value) as 58 | 80 })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value={58}>58mm (2 inch)</option>
                      <option value={80}>80mm (3 inch)</option>
                      <option value="A4">A4 (210mm)</option>
                    </select>
                  </div>

                  {/* Copies */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Copies</label>
                    <select
                      value={printer.copies}
                      onChange={e => updatePrinter(printer.id, { copies: parseInt(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'copy' : 'copies'}</option>
                      ))}
                    </select>
                  </div>

                  {/* Auto Print */}
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printer.autoPrint}
                        onChange={e => updatePrinter(printer.id, { autoPrint: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-700">Auto-print on order</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Test Print */}
              {printer.enabled && (
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {printer.connection === 'usb' && 'Connect via USB cable · ESC/POS compatible'}
                    {printer.connection === 'bluetooth' && 'Pair via Bluetooth · ESC/POS compatible'}
                    {printer.connection === 'network' && 'Network printer · ESC/POS over TCP'}
                    {printer.connection === 'windows' && 'Uses Windows driver · Any printer installed on system'}
                  </div>
                  <button
                    onClick={() => testPrint(printer.id)}
                    disabled={testing === printer.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    {testing === printer.id ? 'Printing...' : 'Test Print'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-2xl p-6 border">
        <h3 className="font-bold text-gray-800 mb-3">📋 Printer Setup Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">🧾 Receipt Printer</h4>
            <p>Thermal 80mm printer for customer receipts. Prints after payment. Common models: EPSON TM-T82X, Xprinter XP-58IIH.</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">🧑‍🍳 Kitchen Printer</h4>
            <p>Thermal 80mm printer for kitchen orders. Prints when order is sent. No prices, just items + notes. Usually 2 copies.</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">📊 Report Printer</h4>
            <p>Any Windows printer for daily reports, end-of-day summaries. Uses system printer driver. Can be A4 or thermal.</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">🔌 Connection Types</h4>
            <p><strong>USB:</strong> Direct cable, fastest. <strong>Bluetooth:</strong> Wireless, pair first. <strong>Network:</strong> IP-based, shared printer. <strong>Windows:</strong> Uses installed driver.</p>
          </div>
        </div>
      </div>
    </div>
  )
}