'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { TrendingUp, ShoppingBag, Users, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import { formatTHB, formatTHBCompact } from '@/lib/currency'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useActiveBranch } from '@/lib/use-active-branch'

interface DashboardStats {
  todaySales: number
  todayOrders: number
  totalCustomers: number
  lowStockCount: number
  salesTrend: number
  ordersTrend: number
}

interface SalesData {
  day: string
  sales: number
  orders: number
}

export default function AdminDashboard() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const { branch: activeBranch } = useActiveBranch()

  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    salesTrend: 0,
    ordersTrend: 0,
  })

  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [loading, setLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState<Array<{
    id: string
    orderNumber: string
    total: number
    status: string
    type: string
    createdAt: string
  }>>([])

  useEffect(() => {
    fetchDashboardData()
  }, [activeBranch?.id])

  async function fetchDashboardData() {
    try {
      const branchId = localStorage.getItem('bitepos-active-branch') || ''
      const [ordersRes, customersRes] = await Promise.all([
        fetch(branchId ? `/api/orders?limit=500\u0026branchId=${branchId}` : '/api/orders?limit=500'),
        fetch('/api/customers'),
      ])

      const ordersData = ordersRes.ok ? await ordersRes.json() : []
      const customersData = customersRes.ok ? await customersRes.json() : []

      const today = new Date().toISOString().slice(0, 10)
      const todayOrders = ordersData.filter((o: any) => o.createdAt?.startsWith(today))
      const completedToday = todayOrders.filter((o: any) => o.status === 'completed')

      setRecentOrders(ordersData.slice(0, 8))

      const todaySales = completedToday.reduce((s: number, o: any) => s + (o.total || 0), 0)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const yesterdayOrders = ordersData.filter((o: any) => o.createdAt?.startsWith(yesterday) && o.status === 'completed')
      const yesterdaySales = yesterdayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0)
      const salesTrend = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0

      const lowStockProducts = [] // Would need products API

      setStats({
        todaySales,
        todayOrders: todayOrders.length,
        totalCustomers: customersData.length,
        lowStockCount: lowStockProducts.length,
        salesTrend: Math.round(salesTrend * 10) / 10,
        ordersTrend: 0,
      })

      // Generate sales chart from actual order data
      const dayMap: Record<string, { sales: number; orders: number }> = {}
      ordersData.filter((o: any) => o.status === 'completed').forEach((o: any) => {
        const day = new Date(o.createdAt).toLocaleDateString('en', { weekday: 'short' })
        if (!dayMap[day]) dayMap[day] = { sales: 0, orders: 0 }
        dayMap[day].sales += o.total || 0
        dayMap[day].orders += 1
      })
      setSalesData(Object.entries(dayMap).map(([day, data]) => ({ day, ...data })))
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: t('todaySales'),
      value: formatTHB(stats.todaySales),
      trend: stats.salesTrend,
      icon: TrendingUp,
      color: 'bg-orange-50 text-orange-600',
      iconBg: 'bg-orange-100',
    },
    {
      label: t('todayOrders'),
      value: stats.todayOrders.toString(),
      trend: stats.ordersTrend,
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: t('customers'),
      value: stats.totalCustomers.toString(),
      trend: 5.1,
      icon: Users,
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: t('lowStockAlert'),
      value: stats.lowStockCount.toString(),
      trend: null,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      iconBg: 'bg-red-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here is what is happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, trend, icon: Icon, color, iconBg }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color.split(' ')[1]}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend !== null && (
              <div className="flex items-center gap-1 mt-2">
                {trend >= 0 ? (
                  <ArrowUp className="w-3 h-3 text-green-500" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(trend)}% vs yesterday
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">{t('salesChart')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatTHB(Number(value))} />
              <Bar dataKey="sales" fill="#E85D04" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Trend */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">Orders Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{t('recentOrders')}</h2>
          <a href="./orders" className="text-sm text-primary hover:underline">View all</a>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">{tCommon('loading')}</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t('noData')}</div>
        ) : (
          <div className="divide-y">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-sm text-gray-800">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 capitalize">{order.type} · {new Date(order.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-gray-900">{formatTHB(order.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'voided' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
