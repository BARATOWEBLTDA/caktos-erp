'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Search, Filter, Package, AlertTriangle } from 'lucide-react'
import { cn, formatCurrency, calculatePlatformProfit } from '@/lib/utils'
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

  function refreshProducts() {
    // Em produção, revalidar via router.refresh() ou re-fetch
    window.location.reload()
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

        {/* Categorias - bolinhas */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'flex flex-col items-center gap-1.5 shrink-0 transition-all',
              !selectedCategory ? 'opacity-100' : 'opacity-50 hover:opacity-80'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all',
              !selectedCategory ? 'ring-2 ring-brand-500 ring-offset-2' : ''
            )}
              style={{ background: 'rgb(var(--bg-tertiary))' }}>
              <Package size={20} style={{ color: 'rgb(var(--text-muted))' }} />
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>
              Todos
            </span>
          </button>

          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 shrink-0 transition-all',
                selectedCategory === cat.id ? 'opacity-100' : 'opacity-50 hover:opacity-80'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-full overflow-hidden flex items-center justify-center transition-all',
                selectedCategory === cat.id ? 'ring-2 ring-offset-2' : ''
              )}
                style={{
                  background: cat.image_url ? undefined : `${cat.color}20`,
                  outlineColor: cat.color,
                }}
              >
                {cat.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">💄</span>
                )}
              </div>
              <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'rgb(var(--text-secondary))' }}>
                {cat.name}
              </span>
            </button>
          ))}
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
