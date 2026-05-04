'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Package, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Product, Category, Platform } from '@/types'
import ProductCard from './ProductCard'
import ProductModal from './ProductModal'
import ProductFormModal from './ProductFormModal'

interface ProductsClientProps {
  initialProducts: (Product & { stock_quantity: number; low_stock: boolean })[]
  categories: Category[]
  platforms: Platform[]
  storeId: string
  taxRate: number
}

export default function ProductsClient({
  initialProducts,
  categories,
  platforms,
  storeId,
  taxRate,
}: ProductsClientProps) {
  const supabase = createClient()
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<(typeof initialProducts)[0] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<(typeof initialProducts)[0] | null>(null)

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku?.toLowerCase().includes(search.toLowerCase())) ||
        p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
      const matchCategory = !selectedCategory || p.category_id === selectedCategory
      const matchPlatform = !selectedPlatform ||
        p.platforms?.some(pp => pp.platform_id === selectedPlatform && pp.is_active)
      const matchLowStock = !lowStockOnly || p.low_stock
      return matchSearch && matchCategory && matchPlatform && matchLowStock
    })
  }, [products, search, selectedCategory, selectedPlatform, lowStockOnly])

  async function refreshProducts() {
    // Busca produtos atualizados direto do banco incluindo plataformas
    const { data: updatedProducts } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, color, image_url),
        supplier:suppliers(id, name),
        platforms:product_platforms(
          id, is_active, custom_commission, active_optional_fees, sale_price,
          platform:platforms(id, name, color, base_commission, fixed_fee, has_optional_fees, optional_fees, fixed_fee)
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const { data: stockData } = await supabase
      .from('current_stock')
      .select('product_id, stock_quantity, low_stock')
      .eq('store_id', storeId)

    const stockMap = new Map(stockData?.map(s => [s.product_id, s]) ?? [])

    const productsWithStock = updatedProducts?.map(p => ({
      ...p,
      stock_quantity: stockMap.get(p.id)?.stock_quantity ?? 0,
      low_stock: stockMap.get(p.id)?.low_stock ?? false,
    })) ?? []

    setProducts(productsWithStock as typeof initialProducts)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-xl">Produtos</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {filtered.length} de {products.length} produtos
          </p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setShowForm(true) }}
          className="btn-primary"
        >
          <Plus size={16} />
          Novo produto
        </button>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        {/* Busca + Plataforma */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgb(var(--text-muted))' }} />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-9"
            />
          </div>

          {/* Filtro plataforma */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPlatform(null)}
              className={cn('badge px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                !selectedPlatform ? 'bg-brand-500 text-white' : 'bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))]'
              )}
            >
              Todas
            </button>
            {platforms.map(platform => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id === selectedPlatform ? null : platform.id)}
                className={cn('badge px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                  selectedPlatform === platform.id ? 'text-white' : 'text-[rgb(var(--text-secondary))]'
                )}
                style={{
                  background: selectedPlatform === platform.id ? platform.color : 'rgb(var(--bg-tertiary))',
                }}
              >
                {platform.name}
              </button>
            ))}

            {/* Estoque baixo */}
            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={cn('badge px-3 py-1.5 text-xs font-medium transition-all cursor-pointer gap-1.5',
                lowStockOnly ? 'bg-yellow-500 text-white' : 'bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))]'
              )}
            >
              <AlertTriangle size={12} />
              Estoque baixo
            </button>
          </div>
        </div>

        {/* Categorias - bolinhas estilo cardápio */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {/* Todas */}
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex flex-col items-center gap-2 shrink-0 transition-all"
          >
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-all',
              !selectedCategory
                ? 'ring-3 ring-offset-2'
                : 'opacity-60 hover:opacity-90'
            )}
              style={{
                background: !selectedCategory ? 'linear-gradient(135deg, #c44df0, #f43f5e)' : 'rgb(var(--bg-tertiary))',
                boxShadow: !selectedCategory ? '0 4px 14px rgba(196,77,240,0.4)' : 'none',
                border: !selectedCategory ? '3px solid rgba(196,77,240,0.6)' : '3px solid rgb(var(--border))',
              }}>
              <Package size={24} style={{ color: !selectedCategory ? 'white' : 'rgb(var(--text-muted))' }} />
            </div>
            <span className="text-[11px] font-semibold whitespace-nowrap"
              style={{ color: !selectedCategory ? '#c44df0' : 'rgb(var(--text-secondary))' }}>
              Todos
            </span>
          </button>

          {categories.map(cat => {
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className="flex flex-col items-center gap-2 shrink-0 transition-all"
              >
                <div
                  className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center transition-all"
                  style={{
                    background: cat.image_url ? undefined : `${cat.color}15`,
                    border: isActive ? `3px solid ${cat.color}` : '3px solid rgb(var(--border))',
                    boxShadow: isActive ? `0 4px 14px ${cat.color}50` : 'none',
                    opacity: !isActive && selectedCategory ? 0.55 : 1,
                    padding: cat.image_url ? '0' : '0',
                  }}
                >
                  {cat.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">💄</span>
                  )}
                </div>
                <span className="text-[11px] font-semibold whitespace-nowrap"
                  style={{ color: isActive ? cat.color : 'rgb(var(--text-secondary))' }}>
                  {cat.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid de produtos - Netflix style */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="text-base font-medium" style={{ color: 'rgb(var(--text-muted))' }}>
            Nenhum produto encontrado
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
            {search ? 'Tente outros termos de busca' : 'Cadastre seu primeiro produto'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              platforms={platforms}
              taxRate={taxRate}
              onClick={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      )}

      {/* Modal detalhes produto */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          platforms={platforms}
          taxRate={taxRate}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => {
            setEditProduct(selectedProduct)
            setSelectedProduct(null)
            setShowForm(true)
          }}
        />
      )}

      {/* Modal cadastro/edição */}
      {showForm && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          platforms={platforms}
          storeId={storeId}
          onClose={() => { setShowForm(false); setEditProduct(null) }}
          onSave={refreshProducts}
        />
      )}
    </div>
  )
}