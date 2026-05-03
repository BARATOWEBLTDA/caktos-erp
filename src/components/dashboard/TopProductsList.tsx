// TopProductsList.tsx
'use client'

import { formatCurrency } from '@/lib/utils'

interface Product {
  id: string
  name: string
  image_url: string | null
  total_sold: number
  total_revenue: number
  sale_price: number
}

export function TopProductsList({ products }: { products: Product[] }) {
  if (!products.length) {
    return (
      <div className="text-center py-8" style={{ color: 'rgb(var(--text-muted))' }}>
        <p className="text-sm">Nenhuma venda registrada ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <div key={product.id} className="flex items-center gap-3">
          {/* Rank */}
          <span
            className="w-6 text-center text-xs font-bold shrink-0"
            style={{
              color: index === 0 ? '#f59e0b' : index === 1 ? '#9ca3af' : index === 2 ? '#b45309' : 'rgb(var(--text-muted))',
            }}
          >
            #{index + 1}
          </span>

          {/* Imagem */}
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
            style={{ background: 'rgb(var(--bg-tertiary))' }}>
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-base">💄</div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>
              {product.name}
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              {product.total_sold} vendidos
            </p>
          </div>

          {/* Receita */}
          <p className="text-sm font-semibold shrink-0" style={{ color: '#c44df0' }}>
            {formatCurrency(product.total_revenue)}
          </p>
        </div>
      ))}
    </div>
  )
}

export default TopProductsList
