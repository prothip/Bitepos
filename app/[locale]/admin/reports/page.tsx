'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatTHB, formatTHBCompact } from '@/lib/currency'

interface DailyReport {
  id: string; date: string; totalOrders: number; completedOrders: number; voidedOrders: number
  grossSales: number; discounts: number; netSales: number; taxCollected: number
  cashRevenue: number; cardRevenue: number; mobileRevenue: number
}

const COLORS = ['#E85D04', '#2563EB', '#059669', '#7C3AED']

export default function ReportsPage() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  useEffect(() => {
    const branchId = localStorage.getItem('bitepos-active-branch') || ''
    const url = branchId ? `/api/orders?limit=500&branchId=${branchId}` : '/api/orders?limit=500'
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then((orders: Array<{ subtotal: number; taxAmount: number; discountAmount: number; total: number; status: string; type: string; createdAt: string; payments: Array<{ method: string; amount: number }> }>) => {
        // Generate daily reports from orders
        const dayMap: Record<string, DailyReport> = {}
        orders.forEach(o => {
          const day = new Date(o.createdAt).toISOString().slice(0, 10)
          if (!dayMap[day]) {
            dayMap[day] = { id: day, date: day, totalOrders: 0, completedOrders: 0, voidedOrders: 0, grossSales: 0, discounts: 0, netSales: 0, taxCollected: 0, cashRevenue: 0, cardRevenue: 0, mobileRevenue: 0 }
          }
          const d = dayMap[day]
          d.totalOrders++
          if (o.status === 'completed') {
            d.completedOrders++
            d.grossSales += o.subtotal
            d.discounts += o.discountAmount
            d.netSales += o.total - o.taxAmount
            d.taxCollected += o.taxAmount
            o.payments?.forEach(p => {
              if (p.method === 'cash') d.cashRevenue += p.amount
              else if (p.method === 'card') d.cardRevenue += p.amount
              else d.mobileRevenue += p.amount
            })
          }
          if (o.status === 'voided') d.voidedOrders++
        })
        const sorted = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))
        setReports(sorted)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const chartData = reports.slice(-7).map(r => ({
    date: new Date(r.date).toLocaleDateString('en', { weekday: 'short' }),
    sales: r.netSales,
    orders: r.completedOrders,
  }))

  const paymentPie = [
    { name: 'Cash', value: reports.reduce((s, r) => s + r.cashRevenue, 0) },
    { name: 'Card', value: reports.reduce((s, r) => s + r.cardRevenue, 0) },
    { name: 'Mobile', value: reports.reduce((s, r) => s + r.mobileRevenue, 0) },
  ].filter(p => p.value > 0)

  const totals = reports.reduce((acc, r) => ({
    grossSales: acc.grossSales + r.grossSales,
    netSales: acc.netSales + r.netSales,
    taxCollected: acc.taxCollected + r.taxCollected,
    discounts: acc.discounts + r.discounts,
    totalOrders: acc.totalOrders + r.totalOrders,
    completedOrders: acc.completedOrders + r.completedOrders,
  }), { grossSales: 0, netSales: 0, taxCollected: 0, discounts: 0, totalOrders: 0, completedOrders: 0 })

  const handlePrint = () => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    const businessName = 'BitePOS'
    const totalCash = reports.reduce((s, r) => s + r.cashRevenue, 0)
    const totalCard = reports.reduce((s, r) => s + r.cardRevenue, 0)
    const totalMobile = reports.reduce((s, r) => s + r.mobileRevenue, 0)
    const totalRevenue = totalCash + totalCard + totalMobile
    const totalVoided = reports.reduce((s, r) => s + r.voidedOrders, 0)
    const avgOrder = totals.completedOrders > 0 ? totals.netSales / totals.completedOrders : 0
    const daysInRange = reports.length || 1
    const dailyAvg = totals.netSales / daysInRange

    const rows = reports.slice().reverse().map(r =>
      `<tr><td>${new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td class="r">${r.completedOrders}</td><td class="r">${formatTHB(r.grossSales)}</td><td class="r">${formatTHB(r.discounts)}</td><td class="r">${formatTHB(r.netSales)}</td><td class="r">${formatTHB(r.taxCollected)}</td><td class="r">${formatTHB(r.cashRevenue)}</td><td class="r">${formatTHB(r.cardRevenue)}</td><td class="r">${formatTHB(r.mobileRevenue)}</td><td class="r c">${r.voidedOrders}</td></tr>`
    ).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sales Report - ${businessName}</title>
    <style>
      @page { size: A4; margin: 15mm 12mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.5; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #E85D04; padding-bottom: 12px; margin-bottom: 20px; }
      .header-left h1 { font-size: 20pt; color: #1a1a1a; margin-bottom: 2px; }
      .header-left .subtitle { font-size: 10pt; color: #666; }
      .header-right { text-align: right; font-size: 9pt; color: #555; }
      .header-right .report-title { font-size: 12pt; font-weight: 700; color: #E85D04; margin-bottom: 4px; }
      .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
      .kpi { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 10px 12px; }
      .kpi .label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
      .kpi .value { font-size: 13pt; font-weight: 700; color: #1a1a1a; }
      .kpi .value.green { color: #059669; }
      .kpi .value.red { color: #dc2626; }
      .kpi .value.orange { color: #E85D04; }
      .section-title { font-size: 11pt; font-weight: 700; color: #1a1a1a; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 18px 0 10px; }
      .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
      .summary-table td { padding: 4px 0; font-size: 10pt; }
      .summary-table td:last-child { text-align: right; font-weight: 600; }
      .summary-table .total-row td { border-top: 2px solid #1a1a1a; font-weight: 700; font-size: 11pt; padding-top: 6px; }
      .payment-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .payment-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; text-align: center; }
      .payment-box .pm-label { font-size: 8pt; color: #888; text-transform: uppercase; margin-bottom: 2px; }
      .payment-box .pm-value { font-size: 12pt; font-weight: 700; }
      .payment-box .pm-pct { font-size: 8pt; color: #888; }
      table.detail { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
      table.detail thead th { background: #f1f3f5; padding: 6px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #dee2e6; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; color: #555; }
      table.detail thead th.r { text-align: right; }
      table.detail tbody td { padding: 5px 8px; border-bottom: 1px solid #f1f1f1; }
      table.detail tbody td.r { text-align: right; }
      table.detail tbody td.c { color: #dc2626; }
      table.detail tbody tr:hover { background: #fafafa; }
      table.detail tfoot td { padding: 6px 8px; border-top: 2px solid #1a1a1a; font-weight: 700; font-size: 9pt; }
      table.detail tfoot td.r { text-align: right; }
      .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 8pt; color: #999; }
      .generated { font-size: 7.5pt; color: #bbb; text-align: center; margin-top: 6px; }
      @media print { body { margin: 0; } .no-print { display: none; } }
    </style></head><body>
    <div class="header">
      <div class="header-left">
        <h1>${businessName}</h1>
        <div class="subtitle">Sales Report — ${dateStr}</div>
      </div>
      <div class="header-right">
        <div class="report-title">SALES REPORT</div>
        <div>Generated: ${dateStr} at ${timeStr}</div>
        <div>Period: ${reports.length > 0 ? new Date(reports[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'} – ${reports.length > 0 ? new Date(reports[reports.length-1].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
        <div>Days: ${reports.length}</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="label">Gross Sales</div><div class="value orange">${formatTHB(totals.grossSales)}</div></div>
      <div class="kpi"><div class="label">Net Sales</div><div class="value">${formatTHB(totals.netSales)}</div></div>
      <div class="kpi"><div class="label">Tax Collected</div><div class="value">${formatTHB(totals.taxCollected)}</div></div>
      <div class="kpi"><div class="label">Avg Order</div><div class="value">${formatTHB(avgOrder)}</div></div>
      <div class="kpi"><div class="label">Daily Average</div><div class="value green">${formatTHB(dailyAvg)}</div></div>
    </div>

    <div class="section-title">Revenue Summary</div>
    <table class="summary-table">
      <tr><td>Gross Sales</td><td>${formatTHB(totals.grossSales)}</td></tr>
      <tr><td>Less: Discounts</td><td style="color:#dc2626">−${formatTHB(totals.discounts)}</td></tr>
      <tr><td>Net Sales (excl. tax)</td><td>${formatTHB(totals.netSales)}</td></tr>
      <tr><td>Add: Tax Collected</td><td>${formatTHB(totals.taxCollected)}</td></tr>
      <tr class="total-row"><td>Total Revenue</td><td>${formatTHB(totalRevenue)}</td></tr>
    </table>

    <div class="section-title">Payment Method Breakdown</div>
    <div class="payment-grid">
      <div class="payment-box"><div class="pm-label">Cash</div><div class="pm-value">${formatTHB(totalCash)}</div><div class="pm-pct">${totalRevenue > 0 ? ((totalCash/totalRevenue)*100).toFixed(1) : '0'}%</div></div>
      <div class="payment-box"><div class="pm-label">Card</div><div class="pm-value">${formatTHB(totalCard)}</div><div class="pm-pct">${totalRevenue > 0 ? ((totalCard/totalRevenue)*100).toFixed(1) : '0'}%</div></div>
      <div class="payment-box"><div class="pm-label">Mobile / QR</div><div class="pm-value">${formatTHB(totalMobile)}</div><div class="pm-pct">${totalRevenue > 0 ? ((totalMobile/totalRevenue)*100).toFixed(1) : '0'}%</div></div>
    </div>

    <div class="section-title">Order Statistics</div>
    <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
      <div class="kpi"><div class="label">Total Orders</div><div class="value">${totals.totalOrders}</div></div>
      <div class="kpi"><div class="label">Completed</div><div class="value green">${totals.completedOrders}</div></div>
      <div class="kpi"><div class="label">Voided</div><div class="value red">${totalVoided}</div></div>
      <div class="kpi"><div class="label">Void Rate</div><div class="value">${totals.totalOrders > 0 ? ((totalVoided/totals.totalOrders)*100).toFixed(1) : '0'}%</div></div>
    </div>

    <div class="section-title">Daily Detail</div>
    <table class="detail">
      <thead><tr><th>Date</th><th class="r">Orders</th><th class="r">Gross</th><th class="r">Discounts</th><th class="r">Net</th><th class="r">Tax</th><th class="r">Cash</th><th class="r">Card</th><th class="r">Mobile</th><th class="r">Voided</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td><strong>TOTAL</strong></td><td class="r">${totals.completedOrders}</td><td class="r">${formatTHB(totals.grossSales)}</td><td class="r">${formatTHB(totals.discounts)}</td><td class="r">${formatTHB(totals.netSales)}</td><td class="r">${formatTHB(totals.taxCollected)}</td><td class="r">${formatTHB(totalCash)}</td><td class="r">${formatTHB(totalCard)}</td><td class="r">${formatTHB(totalMobile)}</td><td class="r c">${totalVoided}</td></tr></tfoot>
    </table>

    <div class="footer">
      <div>BitePOS Sales Report</div>
      <div>Confidential — For internal use only</div>
    </div>
    <div class="generated">Generated by BitePOS on ${dateStr} at ${timeStr}</div>
    </body></html>`

    const w = window.open('', '_blank', 'width=800,height=1000')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.onload = () => { w.print() }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('reports')}</h1>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="px-3 py-2 rounded-xl text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m0 0v4m0-4h10m0 0v4m0-4H7" /></svg>
            Print Report
          </button>
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-2 rounded-xl text-sm font-medium ${period === p ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
              {p === 'daily' ? t('dailyReport') : p === 'weekly' ? t('weeklyReport') : t('monthlyReport')}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('grossSales'), value: formatTHB(totals.grossSales) },
          { label: t('netSales'), value: formatTHB(totals.netSales) },
          { label: t('taxCollected'), value: formatTHB(totals.taxCollected) },
          { label: t('discountsGiven'), value: formatTHB(totals.discounts) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">{t('salesChart')}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => formatTHBCompact(v)} />
              <Tooltip formatter={(value) => formatTHB(Number(value))} />
              <Bar dataKey="sales" fill="#E85D04" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">Orders Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Breakdown */}
      {paymentPie.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">Payment Breakdown</h2>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={paymentPie} cx={100} cy={100} innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                  {paymentPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatTHB(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {paymentPie.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-gray-600">{p.name}</span>
                  <span className="font-medium text-gray-900 ml-auto">{formatTHB(p.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Daily Breakdown</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">{tCommon('loading')}</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t('noData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Orders</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Gross</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Net</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Tax</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Voided</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports.slice().reverse().map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">{r.completedOrders}</td>
                    <td className="px-5 py-3 text-right">{formatTHB(r.grossSales)}</td>
                    <td className="px-5 py-3 text-right font-medium">{formatTHB(r.netSales)}</td>
                    <td className="px-5 py-3 text-right">{formatTHB(r.taxCollected)}</td>
                    <td className="px-5 py-3 text-right text-red-500">{r.voidedOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}