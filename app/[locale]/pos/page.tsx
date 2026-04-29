'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ShoppingCart, Grid, List, Search, Star, ChevronDown, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Award, X, Menu, Settings, LogOut, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatTHB } from '@/lib/currency'
import { cn } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { BranchSwitcher } from '@/components/BranchSwitcher'
import VatToggle from '@/components/pos/VatToggle'
import HeldOrdersPanel from '@/components/pos/HeldOrdersPanel'
import ReceiptPrinter from '@/components/pos/ReceiptPrinter'
import KitchenOrderPrinter from '@/components/pos/KitchenOrderPrinter'
import { usePOSStore } from '@/store/posStore'
import { useFeatureFlags } from '@/lib/use-feature-flags'
import { useActiveBranch } from '@/lib/use-active-branch'
import { VatMode, calculateTax } from '@/lib/tax'

interface Category {
  id: string
  nameEn: string
  nameMy: string
  nameZh: string
  nameTh: string
  color: string
}

interface Product {
  id: string
  nameEn: string
  nameMy: string
  nameZh: string
  nameTh: string
  price: number
  categoryId: string
  isFavorite: boolean
  imageUrl: string | null
  isActive: boolean
  pricingType?: string
  unit?: string | null
  stepWeight?: number | null
}

interface CartItem {
  product: Product
  quantity: number
  notes: string
  subtotal: number
  weight?: number
  unit?: string
  pricingType?: string
}

export default function POSPage() {
  const t = useTranslations('pos')
  const tCommon = useTranslations('common')

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<{ id: string; name: string; section: string; seats: number }[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('takeaway')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastOrderNumber, setLastOrderNumber] = useState('')
  const [lastOrderData, setLastOrderData] = useState<any>(null)
  const [showKitchenPrinter, setShowKitchenPrinter] = useState(false)
  const [showReceiptPrinter, setShowReceiptPrinter] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile' | 'points'>('cash')
  const [amountTendered, setAmountTendered] = useState('')
  const [loading, setLoading] = useState(true)
  const { locale } = useParams() as { locale: string }
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [vatMode, setVatMode] = useState<VatMode>('exclusive')
  const [showTables, setShowTables] = useState(false)
  const [tipAmount, setTipAmount] = useState(0)
  const { flags, loading: flagsLoading } = useFeatureFlags()
  const { branch: activeBranch } = useActiveBranch()
  const [weightProduct, setWeightProduct] = useState<Product | null>(null)
  const [weightInput, setWeightInput] = useState('0.5')
  const orderTypes = ['dine-in', 'takeaway', 'delivery'] as const
  const visibleOrderTypes = orderTypes.filter(type => {
    if (type === 'dine-in' && !flags.tables) return false
    if (type === 'delivery' && !flags.delivery) return false
    return true
  })

  // Adjust default order type when flags load
  useEffect(() => {
    if (!flagsLoading) {
      if (flags.tables) setOrderType('dine-in')
      else if (flags.delivery) setOrderType('delivery')
    }
  }, [flagsLoading])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const fetches: Promise<Response>[] = [fetch('/api/categories'), fetch('/api/products')]
      if (flags.tables) fetches.push(fetch('/api/tables'))
      const results = await Promise.all(fetches)
      const catsRes = results[0]
      const prodsRes = results[1]
      if (!catsRes.ok || !prodsRes.ok) {
        if (catsRes.status === 401 || prodsRes.status === 401) {
          window.location.href = `/${locale}/login`
          return
        }
      }
      const catsData = await catsRes.json()
      const prodsData = await prodsRes.json()
      setCategories(Array.isArray(catsData) ? catsData : [])
      setProducts(Array.isArray(prodsData) ? prodsData : [])
      if (results[2]) {
        const tablesData = await results[2].json()
        setTables(Array.isArray(tablesData) ? tablesData : [])
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  function getProductName(product: Product): string {
    switch (locale) {
      case 'my': return product.nameMy || product.nameEn
      case 'zh': return product.nameZh || product.nameEn
      case 'th': return product.nameTh || product.nameEn
      default: return product.nameEn
    }
  }

  function getCategoryName(cat: Category): string {
    switch (locale) {
      case 'my': return cat.nameMy || cat.nameEn
      case 'zh': return cat.nameZh || cat.nameEn
      case 'th': return cat.nameTh || cat.nameEn
      default: return cat.nameEn
    }
  }

  function getUnitLabel(unit?: string | null): string {
    switch (unit) {
      case 'kg': return t('unitKg')
      case 'g': return t('unitG')
      case 'lb': return t('unitLb')
      case 'oz': return t('unitOz')
      default: return unit || ''
    }
  }

  const filteredProducts = products.filter((p) => {
    if (!p.isActive) return false
    if (showFavorites && !p.isFavorite) return false
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        p.nameEn.toLowerCase().includes(query) ||
        p.nameTh.toLowerCase().includes(query) ||
        p.nameMy.toLowerCase().includes(query) ||
        p.nameZh.toLowerCase().includes(query)
      )
    }
    return true
  })

  function addToCart(product: Product) {
    // Weight-based product — show weight dialog
    if (flags.weightPricing && product.pricingType === 'per_unit') {
      setWeightProduct(product)
      setWeightInput(String(product.stepWeight || 0.05))
      return
    }
    // Regular product
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.product.price }
            : item
        )
      }
      return [...prev, { product, quantity: 1, notes: '', subtotal: product.price }]
    })
  }

  function addWeightToCart() {
    if (!weightProduct) return
    const weight = parseFloat(weightInput) || 0
    if (weight <= 0) return
    const unit = weightProduct.unit || 'kg'
    setCart((prev) => [...prev, {
      product: weightProduct,
      quantity: 1,
      notes: '',
      subtotal: weight * weightProduct.price,
      weight,
      unit,
      pricingType: 'per_unit',
    }])
    setWeightProduct(null)
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id !== productId) return item
          const newQty = item.quantity + delta
          if (newQty <= 0) return null
          return { ...item, quantity: newQty, subtotal: newQty * item.product.price }
        })
        .filter(Boolean) as CartItem[]
    })
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  function clearCart() {
    setCart([])
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const taxCalc = calculateTax(cartTotal, 7, vatMode)
  const taxAmount = taxCalc.taxAmount
  const orderTotal = taxCalc.total + tipAmount
  const changeDue = parseFloat(amountTendered || '0') - orderTotal

  async function sendToKitchen() {
    if (cart.length === 0) return
    try {
      const orderData = {
        type: orderType,
        branchId: activeBranch?.id || undefined,
        tableId: selectedTable,
        status: 'pending',
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          nameSnapshot: item.product.nameEn,
          notes: item.notes,
          weight: item.weight,
          unit: item.unit,
          pricingType: item.pricingType || 'per_item',
        })),
        subtotal: cartTotal,
        taxAmount,
        total: orderTotal,
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      if (res.ok) {
        const data = await res.json()
        setLastOrderNumber(data.orderNumber || '')
        setLastOrderData(data)
        setShowSuccess(true)
        setCart([])
        setAmountTendered('')
        setTimeout(() => {
          setShowSuccess(false)
          setShowKitchenPrinter(true)
        }, 2000)
      }
    } catch (err) {
      console.error('Send to kitchen failed:', err)
    }
  }

  async function handleCheckout() {
    if (cart.length === 0) return

    try {
      const orderData = {
        type: orderType,
        branchId: activeBranch?.id || undefined,
        tableId: selectedTable,
        status: 'completed',
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          nameSnapshot: item.product.nameEn,
          notes: item.notes,
          weight: item.weight,
          unit: item.unit,
          pricingType: item.pricingType || 'per_item',
        })),
        subtotal: cartTotal,
        taxAmount,
        total: orderTotal,
        paymentMethod,
        amountTendered: parseFloat(amountTendered || String(orderTotal)),
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      if (res.ok) {
        const data = await res.json()
        setLastOrderNumber(data.orderNumber || '')
        setLastOrderData(data)
        setCart([])
        setShowCheckout(false)
        setAmountTendered('')
        setShowReceiptPrinter(true)
      }
    } catch (err) {
      console.error('Checkout failed:', err)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex flex-1 overflow-hidden">
      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">BP</span>
            </div>
            <span className="font-semibold text-gray-800">BitePOS POS</span>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('searchProducts')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showFavorites ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              <Star className="w-5 h-5" />
            </button>
            <BranchSwitcher />
            <LanguageSwitcher />
            <a
              href={`/${locale}/admin`}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </a>
            <button
              onClick={() => { fetch('/api/auth/logout', { method: 'POST' }); window.location.href = `/${locale}/login` }}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Order Type Tabs */}
        <div className="bg-white border-b px-4 flex items-center gap-3 py-2">
          <div className="flex items-center gap-1">
            {(visibleOrderTypes).map((type) => (
              <button
                key={type}
                onClick={() => { setOrderType(type); if (type !== 'dine-in') setSelectedTable(null) }}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                  orderType === type
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {type === 'dine-in' ? t('dineIn') : type === 'takeaway' ? t('takeaway') : t('delivery')}
              </button>
            ))}
          </div>

          {orderType === 'dine-in' && (
            <select
              value={selectedTable || ''}
              onChange={e => setSelectedTable(e.target.value || null)}
              className="border rounded-lg px-2 py-1.5 text-sm bg-white"
            >
              <option value="">{t('selectTable') || 'Select Table'}</option>
              {tables.map(tb => (
                <option key={tb.id} value={tb.id}>{tb.name} ({tb.section})</option>
              ))}
            </select>
          )}

          <div className="ml-auto">
            <VatToggle vatMode={vatMode} onToggle={setVatMode} />
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {tCommon('all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === cat.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              style={selectedCategory === cat.id ? { backgroundColor: cat.color } : undefined}
            >
              {getCategoryName(cat)}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">{tCommon('loading')}</div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="product-card bg-white rounded-xl p-3 text-left shadow-sm hover:shadow-md border border-transparent hover:border-primary/20 transition-all"
                >
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.nameEn} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">🍽️</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">
                    {getProductName(product)}
                  </p>
                  <p className="text-primary font-bold mt-1">{formatTHB(product.price)}{flags.weightPricing && product.pricingType === 'per_unit' ? `/${getUnitLabel(product.unit)}` : ''}</p>
                  {product.isFavorite && (
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 absolute top-2 right-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-96 bg-white border-l flex flex-col">
        {/* Cart Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-800">{t('cart')}</span>
            {cart.length > 0 && (
              <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              {tCommon('clear')}
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <ShoppingCart className="w-12 h-12 opacity-30" />
              <p className="text-sm">{t('noItemsInCart')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.product.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 flex-1">
                      {getProductName(item.product)}
                      {item.pricingType === 'per_unit' && item.weight && (
                        <span className="text-xs text-gray-500 ml-1">{item.weight}{item.unit} @ {formatTHB(item.product.price)}/{getUnitLabel(item.unit)}</span>
                      )}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors mt-0.5"
>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {item.pricingType === 'per_unit' ? (
                      <span className="text-xs text-gray-500">{item.weight}{item.unit} × {formatTHB(item.product.price)}/{getUnitLabel(item.unit)}</span>
                    ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                      >
                        <Plus className="w-3 h-3 text-primary" />
                      </button>
                    </div>
                    )}
                    <span className="text-sm font-semibold text-gray-800">
                      {formatTHB(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t bg-gray-50">
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{tCommon('subtotal')}</span>
                <span>{formatTHB(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{tCommon('tax')} (7%)</span>
                <span>{formatTHB(taxAmount)}</span>
              </div>
              {flags.tips && (
                <div className="flex justify-between text-sm text-gray-600 items-center">
                  <span>Tip</span>
                  <div className="flex gap-1">
                    {[0, 10, 20, 50].map(amt => (
                      <button key={amt} onClick={() => setTipAmount(amt)}
                        className={cn('px-2 py-0.5 text-xs rounded-full border', tipAmount === amt ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:border-primary/50')}>
                        {amt === 0 ? 'None' : formatTHB(amt)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-gray-900 pt-1.5 border-t">
                <span>{tCommon('total')}</span>
                <span className="text-primary">{formatTHB(orderTotal)}</span>
              </div>
            </div>

            {!showCheckout ? (
              <div className="px-4 pb-4 space-y-2">
                {flags.kitchenDisplay && (
                <button
                  onClick={sendToKitchen}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {t('sendToKitchen') || 'Send to Kitchen'}
                </button>
                )}
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  {t('checkout')} · {formatTHB(orderTotal)}
                </button>
              </div>
            ) : (
              <div className="px-4 pb-4 space-y-3">
                {/* Payment Method */}
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { method: 'cash' as const, label: t('cashPayment'), icon: Banknote },
                    { method: 'card' as const, label: t('cardPayment'), icon: CreditCard },
                    { method: 'mobile' as const, label: t('mobilePayment'), icon: Smartphone },
                    ...(flags.loyalty ? [{ method: 'points' as const, label: t('pointsPayment'), icon: Award }] : []),
                  ]).map(({ method, label, icon: Icon }) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-colors',
                        paymentMethod === method
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary/50'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'cash' && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t('amountTendered')}</label>
                    <input
                      type="number"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      placeholder={String(Math.ceil(orderTotal))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    {parseFloat(amountTendered) >= orderTotal && (
                      <p className="text-sm text-green-600 mt-1">
                        {t('changeDue')}: {formatTHB(changeDue)}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {tCommon('back')}
                  </button>
                  {flags.kitchenDisplay && (
                  <button
                    onClick={sendToKitchen}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    {t('sendToKitchen') || 'Send to Kitchen'}
                  </button>
                  )}
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  {t('payNow')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Success overlay */}
      {showSuccess && flags.kitchenDisplay && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-sm">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Sent to Kitchen!</h2>
            {lastOrderNumber && <p className="text-gray-500">#{lastOrderNumber}</p>}
          </div>
        </div>
      )}

      {/* Held Orders Panel */}
      <HeldOrdersPanel />

      {/* Weight Input Dialog */}
      {weightProduct && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setWeightProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-lg">{getProductName(weightProduct)}</h2>
              <p className="text-sm text-gray-500">{formatTHB(weightProduct.price)}/{getUnitLabel(weightProduct.unit)}</p>
            </div>
            <div className="px-6 py-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">{t('enterWeight')} ({getUnitLabel(weightProduct.unit)})</label>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setWeightInput(w => String(Math.max(0.01, parseFloat(w) - (weightProduct.stepWeight || 0.05))))}
                  className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-2xl font-bold transition-colors"
                >−</button>
                <input
                  type="number"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  step={weightProduct.stepWeight || 0.05}
                  min="0.01"
                  className="flex-1 h-14 text-center text-2xl font-bold border-2 border-primary/30 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => setWeightInput(w => String(parseFloat(w) + (weightProduct.stepWeight || 0.05)))}
                  className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 text-2xl font-bold text-primary transition-colors"
                >+</button>
              </div>
              {/* Quick weight buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[0.25, 0.5, 0.75, 1].map(w => (
                  <button
                    key={w}
                    onClick={() => setWeightInput(String(w))}
                    className={cn(
                      'py-2 rounded-lg text-sm font-medium border transition-colors',
                      parseFloat(weightInput) === w ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary/50'
                    )}
                  >
                    {w} {getUnitLabel(weightProduct.unit)}
                  </button>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">{weightInput} {getUnitLabel(weightProduct.unit)} × {formatTHB(weightProduct.price)}/{getUnitLabel(weightProduct.unit)}</p>
                <p className="text-2xl font-bold text-primary mt-1">{formatTHB(parseFloat(weightInput) * weightProduct.price)}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button
                onClick={() => setWeightProduct(null)}
                className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={addWeightToCart}
                disabled={parseFloat(weightInput) <= 0}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {t('addToCart')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kitchen Order Printer */}
      {flags.kitchenDisplay && showKitchenPrinter && lastOrderData && (
        <KitchenOrderPrinter
          order={{
            orderNumber: lastOrderData.orderNumber,
            type: lastOrderData.type,
            table: lastOrderData.table,
            items: lastOrderData.items,
            createdAt: lastOrderData.createdAt,
            staff: lastOrderData.staff,
          }}
          onClose={() => setShowKitchenPrinter(false)}
        />
      )}

      {/* Receipt Printer */}
      {showReceiptPrinter && lastOrderData && (
        <ReceiptPrinter
          order={lastOrderData}
          shopSettings={{
            shopName: 'BitePOS',
            shopAddress: '',
            shopPhone: '',
            taxId: '',
            receiptFooter: 'Thank you!',
          }}
          locale={locale}
          onClose={() => setShowReceiptPrinter(false)}
        />
      )}
      </div>
    </div>
  )
}
