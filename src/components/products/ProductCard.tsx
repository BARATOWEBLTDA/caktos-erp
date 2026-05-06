'use client'

import { formatCurrency, formatPercent, calculatePlatformProfit } from '@/lib/utils'
import type { Product, Platform } from '@/types'

interface ProductCardProps {
  product: Product & { stock_quantity: number; low_stock: boolean }
  platforms: Platform[]
  taxRate: number
  onClick: () => void
}

const PLATFORM_LOGOS: Record<string, string> = {
  shopee: 'https://cdn.awsli.com.br/2500x2500/2015/2015798/produto/354645871/shoppe--2--mvj1hgvttt.png',
  tiktok: 'https://static.vecteezy.com/system/resources/thumbnails/066/712/310/small_2x/tiktok-shop-icon-logo-symbol-free-png.png',
  mercadolivre: 'https://s2.glbimg.com/Bu6upvmSg6SRv0za635uXphThKo=/620x430/e.glbimg.com/og/ed/f/original/2020/03/28/mercado-livre.jpg',
}

export default function ProductCard({ product, platforms, taxRate, onClick }: ProductCardProps) {
  const displayProfits = platforms
    .map(platform => {
      const productPlatform = product.platforms?.find(pp => pp.platform_id === platform.id)
      if (!productPlatform?.is_active) return null
      const salePrice = productPlatform?.sale_price ?? null
      if (!salePrice) return null
      return {
        platform,
        salePrice,
        productPlatform,
        profit: calculatePlatformProfit(salePrice, product.purchase_price, platform, productPlatform, 0, taxRate)
      }
    })
    .filter(Boolean) as Array<{
      platform: typeof platforms[0]
      salePrice: number
      productPlatform: NonNullable<typeof product.platforms>[0]
      profit: ReturnType<typeof calculatePlatformProfit>
    }>

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col"
      style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-card)' }}
      onClick={onClick}
    >
      {/* Imagem — sem badges */}
      <div className="relative w-full" style={{ aspectRatio: '1', background: 'rgb(var(--bg-tertiary))' }}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">💄</div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2.5">
        {/* Nome */}
        <p className="text-sm font-semibold line-clamp-2 leading-snug"
          style={{ color: 'rgb(var(--text-primary))', fontFamily: 'Sora, sans-serif' }}>
          {product.name}
        </p>

        {/* Preço de compra */}
        <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-muted))' }}>
          Preço de Compra: <span className="font-semibold" style={{ color: 'rgb(var(--text-secondary))' }}>
            {formatCurrency(product.purchase_price)}
          </span>
        </p>

        {/* Lucro por plataforma */}
        <div className="space-y-2">
          {displayProfits.length === 0 && (
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              Nenhuma plataforma vinculada
            </p>
          )}
          {displayProfits.map(({ platform, salePrice, profit }) => (
            <div key={platform.id} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: 'white', padding: '2px' }}>
                {PLATFORM_LOGOS[platform.slug] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={PLATFORM_LOGOS[platform.slug]} alt={platform.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-3 h-3 rounded-full" style={{ background: platform.color }} />
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  Venda: <span className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                    {formatCurrency(salePrice)}
                  </span>
                </span>
                <span className="text-xs font-bold" style={{ color: profit.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                  Lucro: {formatCurrency(profit.net_profit)}
                </span>
                <span className="text-xs rounded-md px-1.5 py-0.5 font-semibold"
                  style={{
                    background: profit.profit_margin >= 20 ? '#16a34a' : profit.profit_margin >= 10 ? '#d97706' : '#dc2626',
                    color: 'white',
                  }}>
                  {formatPercent(profit.profit_margin)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}