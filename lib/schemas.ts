import { z } from 'zod'

// --- Auth schemas ---

export const pinLoginSchema = z.object({
  pin: z.string().min(1, 'PIN is required').max(10),
})

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

// --- Product schemas ---

export const productCreateSchema = z.object({
  nameEn: z.string().min(1, 'Product name (EN) is required'),
  nameTh: z.string().default(''),
  nameMy: z.string().default(''),
  nameZh: z.string().default(''),
  descriptionEn: z.string().optional().nullable(),
  price: z.number().positive('Price must be positive'),
  costPrice: z.number().optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  pricingType: z.enum(['per_item', 'per_unit']).default('per_item'),
  unit: z.string().optional().nullable(),
  trackStock: z.boolean().default(false),
  stockQty: z.number().int().default(0),
  lowStockAlert: z.number().int().default(5),
  vatMode: z.enum(['exclusive', 'inclusive', 'none']).default('exclusive'),
  isFavorite: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

// --- Order schemas ---

export const orderCreateSchema = z.object({
  type: z.enum(['dine-in', 'takeaway', 'delivery']).default('dine-in'),
  status: z.enum(['pending', 'preparing', 'ready', 'completed']).default('pending'),
  tableId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  staffId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  subtotal: z.number().default(0),
  taxAmount: z.number().default(0),
  discountAmount: z.number().default(0),
  total: z.number().default(0),
  vatMode: z.enum(['exclusive', 'inclusive', 'none']).default('exclusive'),
  taxRate: z.number().default(7),
  notes: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  amountTendered: z.number().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number(),
    nameSnapshot: z.string().min(1),
    notes: z.string().optional().nullable(),
    weight: z.number().optional().nullable(),
    unit: z.string().optional().nullable(),
    pricingType: z.enum(['per_item', 'per_unit']).default('per_item'),
  })).min(1, 'Order must have at least one item'),
})

// --- Staff schemas ---

export const staffCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().nullable(),
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(10),
  role: z.enum(['cashier', 'manager', 'admin']).default('cashier'),
  isActive: z.boolean().default(true),
  branchId: z.string().optional().nullable(),
})

// --- Category schemas ---

export const categoryCreateSchema = z.object({
  nameEn: z.string().min(1, 'Category name (EN) is required'),
  nameTh: z.string().default(''),
  nameMy: z.string().default(''),
  nameZh: z.string().default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format').default('#E85D04'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

// --- Customer schemas ---

export const customerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
})

// --- License schemas ---

export const licenseActivateSchema = z.object({
  key: z.string().min(1, 'License key is required'),
  machine_id: z.string().min(1, 'Machine ID is required'),
  machine_name: z.string().optional(),
})