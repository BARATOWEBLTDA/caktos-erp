'use client'

import { AlertTriangle } from 'lucide-react'
import { formatCurrency, calculatePlatformProfit } from '@/lib/utils'
import type { Product, Platform } from '@/types'

interface ProductCardProps {
  product: Product & { stock_quantity: number; low_stock: boolean }
  platforms: Platform[]
  taxRate: number
  onClick: () => void
}

export default function ProductCard({ product, platforms, taxRate, onClick }: ProductCardProps) {
  // Calcular lucro na primeira plataforma ativa
  const activePlatform = platforms[0]
  const productPlatform = product.platforms?.find(pp => pp.platform_id === activePlatform?.id)

  const profit = activePlatform
    ? calculatePlatformProfit(
        product.sale_price,
        product.purchase_price,
        activePlatform,
        productPlatform,
        0,
        taxRate
      )
    : null

  return (
    <div className="product-card" onClick={onClick}>
      {/* Imagem */}
      <div className="w-full h-full" style={{ background: 'rgb(var(--bg-tertiary))', aspectRatio: '1' }}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            💄
          </div>
        )}
      </div>

      {/* Badge estoque baixo */}
      {product.low_stock && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center"
          title="Estoque baixo">
          <AlertTriangle size={12} className="text-white" />
        </div>
      )}

      {/* Badge estoque zerado */}
      {product.stock_quantity <= 0 && (
        <div className="absolute top-2 left-2 rounded-lg px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white">
          SEM ESTOQUE
        </div>
      )}

      {/* Overlay com info */}
      <div className="product-card-overlay">
        <p className="text-white text-xs font-semibold line-clamp-2 leading-snug mb-1">
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-xs">{product.stock_quantity} un.</span>
          <span className="text-white text-sm font-bold">
            {formatCurrency(product.sale_price)}
          </span>
        </div>
        {profit && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-[10px] font-medium"
              style={{ color: profit.net_profit >= 0 ? '#86efac' : '#fca5a5' }}>
              Lucro: {formatCurrency(profit.net_profit)}
            </span>
            <span className="text-[10px]"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              ({profit.profit_margin.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
