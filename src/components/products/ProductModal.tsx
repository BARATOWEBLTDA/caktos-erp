'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X, Edit2, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatDate, formatPercent, calculatePlatformProfit } from '@/lib/utils'
import type { Product, Platform } from '@/types'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PLATFORM_LOGOS: Record<string, string> = {
  shopee: 'https://cdn.awsli.com.br/2500x2500/2015/2015798/produto/354645871/shoppe--2--mvj1hgvttt.png',
  tiktok: 'https://static.vecteezy.com/system/resources/thumbnails/066/712/310/small_2x/tiktok-shop-icon-logo-symbol-free-png.png',
  mercadolivre: 'https://s2.glbimg.com/Bu6upvmSg6SRv0za635uXphThKo=/620x430/e.glbimg.com/og/ed/f/original/2020/03/28/mercado-livre.jpg',
}

interface ProductModalProps {
  product: Product & { stock_quantity: number; low_stock: boolean }
  platforms: Platform[]
  taxRate: number
  onClose: () => void
  onEdit: () => void
}

export default function ProductModal({ product, platforms, taxRate, onClose, onEdit }: ProductModalProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'info' | 'variacoes'>('info')
  const [stockHistory, setStockHistory] = useState<Array<{
    type: string; quantity: number; notes: string | null; created_at: string
  }>>([])
  const [realStock, setRealStock] = useState<number>(product.stock_quantity)
  const [supplierName, setSupplierName] = useState<string | null>(null)
  const [variations, setVariations] = useState<Array<{
    id: string
    name: string
    sku: string | null
    stock_quantity: number
    prices: Array<{ platform_id: string; sale_price: number; platform_slug: string; platform_name: string; platform_color: string }>
  }>>([])

  useEffect(() => {
    // Estoque real — soma variações se existirem
    async function loadStock() {
      const { data: vars } = await supabase
        .from('current_variation_stock')
        .select('stock_quantity')
        .eq('product_id', product.id)

      if (vars && vars.length > 0) {
        const total = vars.reduce((s, v) => s + (v.stock_quantity ?? 0), 0)
        setRealStock(total)
      } else {
        const { data } = await supabase
          .from('current_stock')
          .select('stock_quantity')
          .eq('product_id', product.id)
          .single()
        if (data) setRealStock(data.stock_quantity)
      }
    }
    loadStock()

    // Histórico de movimentações
    supabase
      .from('stock_movements')
      .select('type, quantity, notes, created_at')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setStockHistory(data ?? []))

    // Fornecedor
    if (product.supplier_id) {
      supabase
        .from('suppliers')
        .select('name')
        .eq('id', product.supplier_id)
        .single()
        .then(({ data }) => setSupplierName(data?.name ?? null))
    }

    // Variações com preços e estoques
    supabase
      .from('product_variations')
      .select(`
        id, name, sku,
        prices:variation_platform_prices(
          platform_id, sale_price,
          platform:platforms(name, slug, color)
        )
      `)
      .eq('product_id', product.id)
      .eq('is_active', true)
      .then(async ({ data: vars }) => {
        if (!vars) return

        // Buscar estoque de cada variação
        const { data: stockData } = await supabase
          .from('current_variation_stock')
          .select('variation_id, stock_quantity')
          .in('variation_id', vars.map(v => v.id))

        const stockMap = new Map(stockData?.map(s => [s.variation_id, s.stock_quantity]) ?? [])

        const enriched = vars.map(v => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          stock_quantity: stockMap.get(v.id) ?? 0,
          prices: (v.prices as Array<{ platform_id: string; sale_price: number; platform: { name: string; slug: string; color: string } | { name: string; slug: string; color: string }[] }>)
            .map(p => {
              const plat = Array.isArray(p.platform) ? p.platform[0] : p.platform
              return {
                platform_id: p.platform_id,
                sale_price: p.sale_price,
                platform_slug: plat?.slug ?? '',
                platform_name: plat?.name ?? '',
                platform_color: plat?.color ?? '',
              }
            }),
        })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' }))

        setVariations(enriched)
      })
  }, [product.id])

  const hasVariations = variations.length > 0

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl animate-scale-in"
          style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0"
              style={{ background: 'rgb(var(--bg-tertiary))' }}>
              {product.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl">💄</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-lg font-bold line-clamp-2"
                style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                {product.name}
              </Dialog.Title>
              {product.sku && (
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                  SKU: {product.sku}
                </p>
              )}
              <div className="flex gap-4 mt-2">
                <span className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                  Compra: <strong style={{ color: 'rgb(var(--text-primary))' }}>{formatCurrency(product.purchase_price)}</strong>
                </span>
                {supplierName && (
                  <span className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                    Fornecedor: <strong style={{ color: 'rgb(var(--text-primary))' }}>{supplierName}</strong>
                  </span>
                )}
              </div>
              <div className="flex gap-3 mt-1.5">
                <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
                  style={{ background: realStock <= 0 ? 'rgba(239,68,68,0.1)' : product.low_stock ? 'rgba(234,179,8,0.1)' : 'rgba(16,185,129,0.1)' }}>
                  <span className="text-xs font-bold"
                    style={{ color: realStock <= 0 ? '#ef4444' : product.low_stock ? '#eab308' : '#10b981' }}>
                    {realStock} un. em estoque
                  </span>
                </div>
                <span className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--text-muted))' }}>
                  <Calendar size={11} />
                  {formatDate(product.created_at)}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={onEdit} className="btn-secondary px-3 py-2 text-xs gap-1.5">
                <Edit2 size={14} /> Editar
              </button>
              <Dialog.Close asChild>
                <button className="btn-ghost px-2 py-2" onClick={onClose}>
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Tabs */}
          {hasVariations && (
            <div className="flex gap-1 p-3 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              {[
                { key: 'info', label: 'Lucro por plataforma' },
                { key: 'variacoes', label: `Lucro por variação (${variations.length})` },
              ].map(tab => (
                <button key={tab.key} type="button"
                  onClick={() => setActiveTab(tab.key as 'info' | 'variacoes')}
                  className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
                  style={{
                    background: activeTab === tab.key ? 'rgba(196,77,240,0.1)' : 'transparent',
                    color: activeTab === tab.key ? '#c44df0' : 'rgb(var(--text-muted))',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-5 space-y-5">

            {/* ABA: Lucro por plataforma */}
            {activeTab === 'info' && (
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
                  Lucro por plataforma
                </h3>
                <div className="space-y-2">
                  {platforms.filter(platform => {
                    const productPlatform = product.platforms?.find(pp => pp.platform_id === platform.id)
                    return productPlatform?.is_active && productPlatform?.sale_price
                  }).map(platform => {
                    const productPlatform = product.platforms?.find(pp => pp.platform_id === platform.id)
                    const salePrice = productPlatform?.sale_price ?? product.sale_price
                    const profit = calculatePlatformProfit(
                      salePrice, product.purchase_price, platform, productPlatform, 0, taxRate
                    )
                    return (
                      <div key={platform.id}
                        className="flex items-center gap-3 rounded-2xl p-3.5"
                        style={{ background: 'rgb(var(--bg-tertiary))' }}>
                        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1"
                          style={{ background: 'white' }}>
                          {PLATFORM_LOGOS[platform.slug]
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={PLATFORM_LOGOS[platform.slug]} alt={platform.name} className="w-full h-full object-contain" />
                            : <div className="w-3 h-3 rounded-full" style={{ background: platform.color }} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                            {platform.name}
                          </p>
                          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                            Venda: {formatCurrency(salePrice)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold" style={{ color: profit.net_profit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'Sora, sans-serif' }}>
                            {formatCurrency(profit.net_profit)}
                          </p>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md text-white inline-block mt-0.5"
                            style={{ background: profit.profit_margin >= 20 ? '#16a34a' : profit.profit_margin >= 10 ? '#d97706' : '#dc2626' }}>
                            {formatPercent(profit.profit_margin)}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Plataformas não vinculadas — botão para adicionar */}
                  {platforms.filter(platform => {
                    const productPlatform = product.platforms?.find(pp => pp.platform_id === platform.id)
                    return !productPlatform?.is_active || !productPlatform?.sale_price
                  }).length > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); onEdit() }}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium transition-all"
                      style={{
                        background: 'transparent',
                        border: '1px dashed rgb(var(--border-strong))',
                        color: 'rgb(var(--text-muted))',
                      }}>
                      + Adicionar plataforma
                    </button>
                  )}
                </div>

                {/* Histórico de estoque */}
                <div className="mt-5">
                  <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
                    Últimas movimentações
                  </h3>
                  {stockHistory.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: 'rgb(var(--text-muted))' }}>
                      Nenhuma movimentação registrada.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stockHistory.map((mov, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                          style={{ background: 'rgb(var(--bg-tertiary))' }}>
                          <div className="flex items-center gap-2.5">
                            {mov.type === 'entrada'
                              ? <TrendingUp size={15} style={{ color: '#10b981' }} />
                              : <TrendingDown size={15} style={{ color: '#ef4444' }} />
                            }
                            <div>
                              <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                                {mov.type === 'entrada' ? 'Entrada' : mov.type === 'saida' ? 'Saída' : 'Ajuste'}
                              </p>
                              {mov.notes && (
                                <p className="text-[11px]" style={{ color: 'rgb(var(--text-muted))' }}>{mov.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold"
                              style={{ color: mov.type === 'entrada' ? '#10b981' : '#ef4444' }}>
                              {mov.type === 'entrada' ? '+' : '-'}{mov.quantity}
                            </p>
                            <p className="text-[11px]" style={{ color: 'rgb(var(--text-muted))' }}>
                              {formatDate(mov.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA: Lucro por variação */}
            {activeTab === 'variacoes' && (
              <div className="space-y-3">
                {variations.map(variation => (
                  <div key={variation.id} className="rounded-2xl overflow-hidden"
                    style={{ border: '1px solid rgb(var(--border))' }}>
                    {/* Header da variação */}
                    <div className="flex items-center justify-between px-4 py-2.5"
                      style={{ background: 'rgb(var(--bg-tertiary))' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                          {variation.name}
                        </p>
                        {variation.sku && (
                          <p className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                            SKU: {variation.sku}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md text-white"
                        style={{ background: variation.stock_quantity <= 0 ? '#dc2626' : '#16a34a' }}>
                        {variation.stock_quantity} un.
                      </span>
                    </div>

                    {/* Preço/lucro por plataforma */}
                    <div className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
                      {variation.prices.length === 0 ? (
                        <p className="text-xs text-center py-3" style={{ color: 'rgb(var(--text-muted))' }}>
                          Sem preços configurados por plataforma
                        </p>
                      ) : (
                        variation.prices.map(vp => {
                          const platform = platforms.find(p => p.id === vp.platform_id)
                          if (!platform) return null
                          const productPlatform = product.platforms?.find(pp => pp.platform_id === vp.platform_id)
                          const profit = calculatePlatformProfit(
                            vp.sale_price,
                            product.purchase_price,
                            platform,
                            productPlatform,
                            0,
                            taxRate
                          )
                          return (
                            <div key={vp.platform_id} className="flex items-center gap-3 px-4 py-2.5">
                              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-0.5"
                                style={{ background: 'white' }}>
                                {PLATFORM_LOGOS[vp.platform_slug]
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={PLATFORM_LOGOS[vp.platform_slug]} alt={vp.platform_name} className="w-full h-full object-contain" />
                                  : <div className="w-2.5 h-2.5 rounded-full" style={{ background: vp.platform_color }} />
                                }
                              </div>
                              <span className="text-sm flex-1" style={{ color: 'rgb(var(--text-secondary))' }}>
                                {vp.platform_name}
                              </span>
                              <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                Venda: {formatCurrency(vp.sale_price)}
                              </span>
                              <span className="text-sm font-bold" style={{ color: profit.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                                {formatCurrency(profit.net_profit)}
                              </span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md text-white"
                                style={{ background: profit.profit_margin >= 20 ? '#16a34a' : profit.profit_margin >= 10 ? '#d97706' : '#dc2626' }}>
                                {formatPercent(profit.profit_margin)}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}