// ============================================================
// CAKTOS ERP - TYPES GLOBAIS
// ============================================================

export type UserRole = 'admin' | 'operator' | 'financial'
export type SupplierType = 'makeup' | 'insumo' | 'embalagem' | 'outro'
export type StockMovementType = 'entrada' | 'saida' | 'ajuste'
export type TransactionType = 'entrada' | 'saida'
export type AccountStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado'
export type RefundStatus = 'aberto' | 'em_analise' | 'aprovado' | 'rejeitado' | 'concluido'
export type RefundResponsibility = 'plataforma' | 'fornecedor' | 'loja' | 'cliente'
export type DocumentType = 'nota_fiscal' | 'comprovante' | 'contrato' | 'outro'

// ============================================================
// STORE
// ============================================================

export interface Store {
  id: string
  name: string
  company_name: string
  slug: string
  logo_url: string | null
  tax_rate: number
  is_active: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================================
// PROFILE
// ============================================================

export interface Profile {
  id: string
  store_id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// CATEGORY
// ============================================================

export interface Category {
  id: string
  store_id: string
  name: string
  slug: string
  image_url: string | null
  color: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ============================================================
// SUPPLIER
// ============================================================

export interface Supplier {
  id: string
  store_id: string
  name: string
  type: SupplierType
  phone: string | null
  email: string | null
  website: string | null
  photo_url: string | null
  payment_term_days: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// PLATFORM
// ============================================================

export interface PlatformOptionalFee {
  id: string
  name: string
  rate: number
  active: boolean
}

export interface Platform {
  id: string
  store_id: string
  name: string
  slug: string
  color: string
  logo_url: string | null
  base_commission: number
  fixed_fee: number
  has_optional_fees: boolean
  optional_fees: PlatformOptionalFee[]
  has_variable_shipping: boolean
  has_category_commission: boolean
  balance: number
  balance_updated_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// PRODUCT
// ============================================================

export interface Product {
  id: string
  store_id: string
  category_id: string | null
  supplier_id: string | null
  name: string
  sku: string | null
  description: string | null
  image_url: string | null
  purchase_price: number
  sale_price: number
  min_stock: number
  is_active: boolean
  tags: string[]
  created_at: string
  updated_at: string
  // Joins
  category?: Category
  supplier?: Supplier
  platforms?: ProductPlatform[]
  stock_quantity?: number
  low_stock?: boolean
}

export interface ProductPlatform {
  id: string
  product_id: string
  platform_id: string
  is_active: boolean
  custom_commission: number | null
  active_optional_fees: string[]
  sale_price: number | null
  created_at: string
  // Joins
  platform?: Platform
}

// Cálculo de lucro por plataforma
export interface ProfitCalculation {
  platform_id: string
  platform_name: string
  platform_color: string
  sale_price: number
  commission_amount: number
  fixed_fee: number
  optional_fees_amount: number
  tax_amount: number
  total_deductions: number
  net_profit: number
  profit_margin: number
}

// ============================================================
// STOCK
// ============================================================

export interface StockMovement {
  id: string
  store_id: string
  product_id: string
  type: StockMovementType
  quantity: number
  unit_cost: number | null
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  // Joins
  product?: Product
}

export interface CurrentStock {
  product_id: string
  store_id: string
  product_name: string
  sku: string | null
  min_stock: number
  image_url: string | null
  purchase_price: number
  sale_price: number
  stock_quantity: number
  low_stock: boolean
}

// ============================================================
// SALES
// ============================================================

export interface Sale {
  id: string
  store_id: string
  platform_id: string | null
  order_code: string | null
  sale_date: string
  subtotal: number
  shipping_cost: number
  discount: number
  total: number
  commission_rate: number
  fixed_fee: number
  optional_fees_applied: Array<{ name: string; rate: number; amount: number }>
  tax_rate: number
  total_fees: number
  tax_amount: number
  net_profit: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joins
  platform?: Platform
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  purchase_price: number
  subtotal: number
  created_at: string
  // Joins
  product?: Product
}

// ============================================================
// REFUNDS
// ============================================================

export interface Refund {
  id: string
  store_id: string
  sale_id: string | null
  product_id: string | null
  reason: string
  amount: number
  status: RefundStatus
  responsibility: RefundResponsibility
  restock: boolean
  notes: string | null
  resolved_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joins
  sale?: Sale
  product?: Product
}

// ============================================================
// FINANCIAL
// ============================================================

export interface FinancialCategory {
  id: string
  store_id: string
  name: string
  type: TransactionType
  color: string
  icon: string | null
  is_active: boolean
  created_at: string
}

export interface FinancialTransaction {
  id: string
  store_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  description: string
  transaction_date: string
  reference_id: string | null
  reference_type: string | null
  platform_id: string | null
  is_confirmed: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joins
  category?: FinancialCategory
  platform?: Platform
  documents?: Document[]
}

export interface AccountsPayable {
  id: string
  store_id: string
  supplier_id: string | null
  description: string
  amount: number
  due_date: string
  paid_at: string | null
  status: AccountStatus
  category_id: string | null
  recurrent: boolean
  recurrence_months: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joins
  supplier?: Supplier
  category?: FinancialCategory
}

export interface AccountsReceivable {
  id: string
  store_id: string
  platform_id: string | null
  description: string
  amount: number
  due_date: string
  received_at: string | null
  status: AccountStatus
  sale_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joins
  platform?: Platform
  sale?: Sale
}

// ============================================================
// DOCUMENTS
// ============================================================

export interface Document {
  id: string
  store_id: string
  name: string
  type: DocumentType
  file_url: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  reference_id: string | null
  reference_type: string | null
  description: string | null
  tags: string[]
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// PLATFORM BALANCE
// ============================================================

export interface PlatformBalance {
  id: string
  platform_id: string
  store_id: string
  balance: number
  notes: string | null
  recorded_at: string
  created_by: string | null
  // Joins
  platform?: Platform
}

export interface BankBalanceHistory {
  id: string
  store_id: string
  balance: number
  notes: string | null
  recorded_at: string
  created_by: string | null
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export interface Notification {
  id: string
  store_id: string
  user_id: string
  type: 'low_stock' | 'overdue_payable' | 'due_soon_payable'
  title: string
  message: string | null
  reference_id: string | null
  reference_type: string | null
  is_read: boolean
  created_at: string
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardStats {
  total_products: number
  active_platforms: number
  low_stock_count: number
  sales_today: { total_orders: number; total_revenue: number; total_profit: number }
  sales_week: { total_orders: number; total_revenue: number; total_profit: number }
  sales_month: { total_orders: number; total_revenue: number; total_profit: number }
  sales_last_month: { total_orders: number; total_revenue: number; total_profit: number }
  top_products: Array<{
    id: string
    name: string
    image_url: string | null
    total_sold: number
    total_revenue: number
    sale_price: number
  }>
  financial_health: {
    stock_cost_value: number
    stock_sale_value: number
    potential_profit: number
  }
  bank_balance: number
  platform_balances: Array<{ platform_name: string; balance: number; color: string }>
  pending_payables: number
  overdue_payables: number
  unread_notifications: number
}

// ============================================================
// API RESPONSE
// ============================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}
