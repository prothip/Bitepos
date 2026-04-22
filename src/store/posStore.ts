import { create } from 'zustand'
import { VatMode } from '@/lib/tax'

export interface CartItem {
  product: {
    id: string
    nameEn: string
    nameTh: string
    nameMy: string
    nameZh: string
    price: number
    imageUrl: string | null
    isFavorite: boolean
    categoryId: string
  }
  quantity: number
  notes: string
  subtotal: number
}

export interface HeldOrder {
  id: string
  name: string
  items: CartItem[]
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  createdAt: Date
}

interface POSState {
  // Cart
  cart: CartItem[]
  addToCart: (product: CartItem['product']) => void
  updateQuantity: (productId: string, delta: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  updateNotes: (productId: string, notes: string) => void

  // Order type
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  setOrderType: (type: 'dine-in' | 'takeaway' | 'delivery') => void

  // VAT mode
  vatMode: VatMode
  setVatMode: (mode: VatMode) => void

  // Held orders
  heldOrders: HeldOrder[]
  holdOrder: (name?: string) => void
  retrieveOrder: (id: string) => void
  removeHeldOrder: (id: string) => void

  // Selected table
  selectedTable: string | null
  setSelectedTable: (tableId: string | null) => void
}

export const usePOSStore = create<POSState>((set, get) => ({
  // Cart
  cart: [],

  addToCart: (product) => {
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id)
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.product.price }
              : item
          ),
        }
      }
      return {
        cart: [...state.cart, { product, quantity: 1, notes: '', subtotal: product.price }],
      }
    })
  },

  updateQuantity: (productId, delta) => {
    set((state) => ({
      cart: state.cart
        .map((item) => {
          if (item.product.id !== productId) return item
          const newQty = item.quantity + delta
          if (newQty <= 0) return null
          return { ...item, quantity: newQty, subtotal: newQty * item.product.price }
        })
        .filter(Boolean) as CartItem[],
    }))
  },

  removeFromCart: (productId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.product.id !== productId),
    }))
  },

  clearCart: () => set({ cart: [] }),

  updateNotes: (productId, notes) => {
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      ),
    }))
  },

  // Order type
  orderType: 'dine-in',
  setOrderType: (type) => set({ orderType: type }),

  // VAT mode
  vatMode: 'exclusive',
  setVatMode: (mode) => set({ vatMode: mode }),

  // Held orders
  heldOrders: [],

  holdOrder: (name) => {
    const { cart, orderType } = get()
    if (cart.length === 0) return

    const held: HeldOrder = {
      id: `hold-${Date.now()}`,
      name: name || `Order ${get().heldOrders.length + 1}`,
      items: [...cart],
      orderType,
      createdAt: new Date(),
    }

    set((state) => ({
      heldOrders: [...state.heldOrders, held],
      cart: [],
    }))
  },

  retrieveOrder: (id) => {
    const { heldOrders } = get()
    const held = heldOrders.find((o) => o.id === id)
    if (!held) return

    set({
      cart: held.items,
      orderType: held.orderType,
      heldOrders: heldOrders.filter((o) => o.id !== id),
    })
  },

  removeHeldOrder: (id) => {
    set((state) => ({
      heldOrders: state.heldOrders.filter((o) => o.id !== id),
    }))
  },

  // Table selection
  selectedTable: null,
  setSelectedTable: (tableId) => set({ selectedTable: tableId }),
}))