'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X, Edit2, Package, Calendar, User, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatDate, formatPercent, calculatePlatformProfit } from '@/lib/utils'
import type { Product, Platform } from '@/types'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProductModalProps {
  product: Product & { stock_quantity: number; low_stock: boolean }
  platforms: Platform[]
  taxRate: number
  onClose: () => void
  onEdit: () => void
}

export default function ProductModal({ product, platforms, taxRate, onClose, onEdit }: ProductModalProps) {
  const [stockHistory, setStockHistory] = useState<Array<{
    type: string
    quantity: number
    notes: string | null
    created_at: string
  }>>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('stock_movements')
      .select('type, quantity, notes, created_at')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setStockHistory(data ?? []))
  }, [product.id])

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl animate-scale-in"
          style={{
            background: 'rgb(var(--bg-card))',
            border: '1px solid rgb(var(--border))',
            boxShadow: 'var(--shadow-modal)',
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-6 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
            {/* Imagem */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0"
              style={{ background: 'rgb(var(--bg-tertiary))' }}>
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">💄</div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-lg font-bold line-clamp-2"
                style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                {product.name}
              </Dialog.Title>
              {product.sku && (
                <p className="text-xs mt-1 font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                  SKU: {product.sku}
                </p>
              )}
              <div className="flex gap-3 mt-2">
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>
                  Compra: <strong style={{ color: 'rgb(var(--text-primary))' }}>{formatCurrency(product.purchase_price)}</strong>
                </span>
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>
                  Venda: <strong style={{ color: '#c44df0' }}>{formatCurrency(product.sale_price)}</strong>
                </span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button onClick={onEdit} className="btn-secondary px-3 py-2 text-xs gap-1.5">
                <Edit2 size={14} />
                Editar
              </button>
              <Dialog.Close asChild>
                <button className="btn-ghost px-2 py-2" onClick={onClose}>
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Estoque', value: `${product.stock_quantity} un.`, icon: Package, color: product.low_stock ? '#eab308' : '#10b981' },
                { label: 'Estoque mínimo', value: `${product.min_stock} un.`, icon: Package, color: 'rgb(var(--text-muted))' },
                { label: 'Cadastrado em', value: formatDate(product.created_at), icon: Calendar, color: 'rgb(var(--text-muted))' },
                { label: 'Fornecedor', value: (product.supplier as { name?: string } | null)?.name ?? '—', icon: User, color: 'rgb(var(--text-muted))' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl p-3"
                  style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>{item.label}</p>
                  <p className="text-sm font-semibold" style={{ color: item.color }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Lucro por plataforma */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
                Lucro por plataforma
              </h3>
              <div className="space-y-2">
                {platforms.map(platform => {
                  const productPlatform = product.platforms?.find(pp => pp.platform_id === platform.id)
                  const isLinked = productPlatform?.is_active
                  const profit = calculatePlatformProfit(
                    productPlatform?.sale_price ?? product.sale_price,
                    product.purchase_price,
                    platform,
                    productPlatform,
                    0,
                    taxRate
                  )

                  return (
                    <div key={platform.id}
                      className={`flex items-center justify-between rounded-xl p-3 ${!isLinked ? 'opacity-40' : ''}`}
                      style={{ background: 'rgb(var(--bg-tertiary))' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: platform.color }} />
                        <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                          {platform.name}
                        </span>
                        {!isLinked && (
                          <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>(não vinculado)</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: profit.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                          {formatCurrency(profit.net_profit)}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                          {formatPercent(profit.profit_margin)} margem
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Histórico de estoque */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
                Histórico de estoque (últimas 10 movimentações)
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
                          <p className="text-xs font-medium capitalize" style={{ color: 'rgb(var(--text-primary))' }}>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}