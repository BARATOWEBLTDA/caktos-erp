import { createClient } from '@/lib/supabase/server'
import ProductsClient from '@/components/products/ProductsClient'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id, store:stores(tax_rate)')
    .eq('id', user!.id)
    .single()

  const storeId = profile?.store_id
  const taxRate = (profile?.store as { tax_rate?: number } | null)?.tax_rate ?? 4

  const [
    { data: products },
    { data: categories },
    { data: platforms },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, color, image_url),
        supplier:suppliers(id, name),
        platforms:product_platforms(
          id, platform_id, is_active, custom_commission, active_optional_fees, sale_price,
          platform:platforms(id, name, slug, color, base_commission, fixed_fee, has_optional_fees, optional_fees)
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order'),

    supabase
      .from('platforms')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true),
  ])

  // Buscar estoque atual para cada produto
  const { data: stockData } = await supabase
    .from('current_stock')
    .select('product_id, stock_quantity, low_stock')
    .eq('store_id', storeId)

  const stockMap = new Map(stockData?.map(s => [s.product_id, s]) ?? [])

  const productsWithStock = products?.map(p => ({
    ...p,
    stock_quantity: stockMap.get(p.id)?.stock_quantity ?? 0,
    low_stock: stockMap.get(p.id)?.low_stock ?? false,
  })) ?? []

  return (
    <ProductsClient
      initialProducts={productsWithStock}
      categories={categories ?? []}
      platforms={platforms ?? []}
      storeId={storeId!}
      taxRate={taxRate}
    />
  )
}