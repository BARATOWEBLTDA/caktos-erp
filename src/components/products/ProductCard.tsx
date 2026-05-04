'use client'

import { AlertTriangle } from 'lucide-react'
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
  // Calcular lucro por plataforma ativa no produto
  const activePlatforms = platforms.filter(p => {
    const pp = product.platforms?.find(pp => pp.platform_id === p.id)
    return pp?.is_active
  })

  const profits = activePlatforms.map(platform => {
    const productPlatform = product.platforms?.find(pp => pp.platform_id === platform.id)
    return {
      platform,
      profit: calculatePlatformProfit(
        productPlatform?.sale_price ?? product.sale_price,
        product.purchase_price,
        platform,
        productPlatform,
        0,
        taxRate
      )
    }
  })

  // Se não houver plataformas vinculadas, mostra a primeira disponível
  const displayProfits = profits.length > 0
    ? profits
    : platforms.slice(0, 3).map(platform => ({
        platform,
        profit: calculatePlatformProfit(product.sale_price, product.purchase_price, platform, undefined, 0, taxRate)
      }))

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col"
      style={{
        background: 'rgb(var(--bg-card))',
        border: '1px solid rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
      onClick={onClick}
    >
      {/* Imagem */}
      <div className="relative w-full" style={{ aspectRatio: '1', background: 'rgb(var(--bg-tertiary))' }}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">💄</div>
        )}

        {/* Badge estoque baixo */}
        {product.low_stock && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center"
            title="Estoque baixo">
            <AlertTriangle size={12} className="text-white" />
          </div>
        )}

        {/* Badge sem estoque */}
        {product.stock_quantity <= 0 && (
          <div className="absolute top-2 left-2 rounded-lg px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white">
            SEM ESTOQUE
          </div>
        )}
      </div>

      {/* Informações abaixo da imagem */}
      <div className="p-3 flex flex-col gap-2">
        {/* Nome + preço de compra */}
        <div>
          <p className="text-sm font-semibold line-clamp-2 leading-snug"
            style={{ color: 'rgb(var(--text-primary))', fontFamily: 'Sora, sans-serif' }}>
            {product.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            Custo: <span className="font-medium">{formatCurrency(product.purchase_price)}</span>
          </p>
        </div>

        {/* Lucro por plataforma */}
        <div className="space-y-1.5">
          {displayProfits.map(({ platform, profit }) => {
            const productPlatform = product.platforms?.find(pp => pp.platform_id === platform.id)
            const salePrice = productPlatform?.sale_price ?? product.sale_price
            return (
            <div key={platform.id} className="flex items-center gap-2">
              {/* Logo da plataforma */}
              <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: 'white', padding: '1px' }}>
                {PLATFORM_LOGOS[platform.slug] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={PLATFORM_LOGOS[platform.slug]}
                    alt={platform.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-3 h-3 rounded-full" style={{ background: platform.color }} />
                )}
              </div>
              {/* Valores */}
              <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
                <span className="text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>
                  Venda: <span className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{formatCurrency(salePrice)}</span>
                </span>
                <span className="text-[10px] font-bold"
                  style={{ color: profit.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                  Lucro: {formatCurrency(profit.net_profit)}
                </span>
                <span className="text-[10px] rounded-md px-1 py-0.5 font-medium"
                  style={{
                    background: profit.net_profit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: profit.net_profit >= 0 ? '#10b981' : '#ef4444',
                  }}>
                  {formatPercent(profit.profit_margin)}
                </span>
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}