'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, TrendingUp, TrendingDown, Settings2, Search, Loader2, X, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface StockProduct {
  product_id: string
  product_name: string
  sku: string | null
  image_url: string | null
  purchase_price: number
  sale_price: number
  stock_quantity: number
  low_stock: boolean
  min_stock: number
  has_variations?: boolean
  variations?: Array<{
    id: string
    name: string
    sku: string | null
    stock_quantity: number
  }>
}

interface StockMovement {
  id: string
  type: string
  quantity: number
  unit_cost: number | null
  notes: string | null
  created_at: string
  product_name?: string
  variation_name?: string
  image_url?: string | null
}

export default function EstoquePage() {
  const supabase = createClient()
  const [products, setProducts] = useState<StockProduct[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [storeId, setStoreId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'estoque' | 'historico'>('estoque')
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    product_id: '',
    variation_id: '',
    type: 'entrada' as 'entrada' | 'ajuste',
    quantity: '',
    unit_cost: '',
    notes: '',
  })

  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user!.id).single()
    const sid = profile!.store_id
    setStoreId(sid)

    // Buscar estoque atual
    const { data: stockData } = await supabase
      .from('current_stock')
      .select('*')
      .eq('store_id', sid)
      .order('product_name')

    // Buscar variações e seus estoques
    const { data: variationsData } = await supabase
      .from('current_variation_stock')
      .select('variation_id, product_id, variation_name, sku, stock_quantity')
      .order('variation_name')

    const variationsByProduct = new Map<string, Array<{ id: string; name: string; sku: string | null; stock_quantity: number }>>()
    variationsData?.forEach((v: { variation_id: string; product_id: string; variation_name: string; sku: string | null; stock_quantity: number }) => {
      if (!variationsByProduct.has(v.product_id)) {
        variationsByProduct.set(v.product_id, [])
      }
      variationsByProduct.get(v.product_id)!.push({
        id: v.variation_id,
        name: v.variation_name,
        sku: v.sku,
        stock_quantity: v.stock_quantity,
      })
    })

    // Ordenar variações com ordenação natural (FS10, FS20, FS30...)
    variationsByProduct.forEach((variations, key) => {
      variations.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' }))
    })

    const productsWithVariations = (stockData ?? []).map(p => ({
      ...p,
      variations: variationsByProduct.get(p.product_id) ?? [],
      has_variations: (variationsByProduct.get(p.product_id) ?? []).length > 0,
    }))

    setProducts(productsWithVariations)

    // Histórico — movimentações normais + variações
    const { data: movementsData } = await supabase
      .from('stock_movements')
      .select('id, type, quantity, unit_cost, notes, created_at, product:products(name, image_url)')
      .eq('store_id', sid)
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: variationMovements } = await supabase
      .from('variation_stock')
      .select('id, type, quantity, unit_cost, notes, created_at, variation:product_variations(name, product:products(name, image_url))')
      .eq('store_id', sid)
      .order('created_at', { ascending: false })
      .limit(100)

    const allMovements: StockMovement[] = [
      ...(movementsData ?? []).map((m: any) => ({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        unit_cost: m.unit_cost,
        notes: m.notes,
        created_at: m.created_at,
        product_name: m.product?.name,
        image_url: m.product?.image_url,
      })),
      ...(variationMovements ?? []).map((m: any) => ({
        id: `var-${m.id}`,
        type: m.type,
        quantity: m.quantity,
        unit_cost: m.unit_cost,
        notes: m.notes,
        created_at: m.created_at,
        product_name: m.variation?.product?.name,
        variation_name: m.variation?.name,
        image_url: m.variation?.product?.image_url,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setMovements(allMovements)
    setLoading(false)
  }

  function openModal(product?: StockProduct, variationId?: string) {
    setSelectedProduct(product ?? null)
    setForm({
      product_id: product?.product_id ?? '',
      variation_id: variationId ?? '',
      type: 'entrada',
      quantity: '',
      unit_cost: '',
      notes: '',
    })
    setShowModal(true)
  }

  function toggleExpand(productId: string) {
    setExpandedProducts(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.quantity) return
    setSaving(true)
    try {
      if (form.variation_id) {
        // Movimentação de variação
        const { error } = await supabase.from('variation_stock').insert({
          store_id: storeId,
          variation_id: form.variation_id,
          type: form.type,
          quantity: parseInt(form.quantity),
          unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
          notes: form.notes || null,
          reference_type: 'manual',
        })
        if (error) throw error
      } else {
        // Movimentação de produto simples
        const { error } = await supabase.from('stock_movements').insert({
          store_id: storeId,
          product_id: form.product_id,
          type: form.type,
          quantity: parseInt(form.quantity),
          unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
          notes: form.notes || null,
          reference_type: 'manual',
        })
        if (error) throw error
      }
      toast.success('Movimentação registrada!')
      setShowModal(false)
      load()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = products.filter(p =>
    !search ||
    p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.variations?.some(v => v.name.toLowerCase().includes(search.toLowerCase()))
  )

  const totalValue = products.reduce((s, p) => {
    if (p.has_variations) {
      return s + (p.variations?.reduce((vs, v) => vs + v.stock_quantity * p.purchase_price, 0) ?? 0)
    }
    return s + p.stock_quantity * p.purchase_price
  }, 0)
  const lowStockCount = products.filter(p => p.low_stock).length
  const totalItems = products.reduce((s, p) => {
    if (p.has_variations) {
      return s + (p.variations?.reduce((vs, v) => vs + v.stock_quantity, 0) ?? 0)
    }
    return s + p.stock_quantity
  }, 0)

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-xl">Estoque</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {products.length} produtos · {totalItems} unidades no total
          </p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus size={16} /> Movimentar estoque
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Valor em estoque</p>
          <p className="text-xl font-bold gradient-text" style={{ fontFamily: 'Sora, sans-serif' }}>
            {formatCurrency(totalValue)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Preço de custo</p>
        </div>
        <div className="card p-4">
          <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Total de unidades</p>
          <p className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
            {totalItems}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Em {products.length} produtos</p>
        </div>
        <div className="card p-4">
          <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Estoque baixo</p>
          <p className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: lowStockCount > 0 ? '#eab308' : '#10b981' }}>
            {lowStockCount}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {lowStockCount > 0 ? 'Produto(s) abaixo do mínimo' : 'Tudo em ordem'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgb(var(--bg-tertiary))' }}>
        {(['estoque', 'historico'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{
              background: tab === t ? 'rgb(var(--bg-card))' : 'transparent',
              color: tab === t ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
              boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
            }}>
            {t === 'estoque' ? 'Posição atual' : 'Histórico de entradas'}
          </button>
        ))}
      </div>

      {tab === 'estoque' && (
        <>
          <div className="relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
            <input type="text" placeholder="Buscar produto ou variação..." className="input-base pl-9"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl shimmer" />)}</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-container">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Produto / Variação</th>
                      <th>SKU</th>
                      <th>Estoque</th>
                      <th>Mínimo</th>
                      <th>Custo unit.</th>
                      <th>Valor total</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <>
                        {/* Linha do produto */}
                        <tr key={p.product_id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              {p.has_variations && (
                                <button onClick={() => toggleExpand(p.product_id)}
                                  className="p-0.5 rounded transition-colors hover:bg-[rgb(var(--bg-tertiary))]">
                                  {expandedProducts.has(p.product_id)
                                    ? <ChevronDown size={14} style={{ color: 'rgb(var(--text-muted))' }} />
                                    : <ChevronRight size={14} style={{ color: 'rgb(var(--text-muted))' }} />
                                  }
                                </button>
                              )}
                              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0"
                                style={{ background: 'rgb(var(--bg-tertiary))' }}>
                                {p.image_url
                                  ? <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-base">💄</div>
                                }
                              </div>
                              <div>
                                <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                                  {p.product_name}
                                </span>
                                {p.has_variations && (
                                  <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                    {p.variations?.length} variações
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                              {p.sku ?? '—'}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm font-bold"
                              style={{ color: p.has_variations ? 'rgb(var(--text-muted))' : p.stock_quantity <= 0 ? '#ef4444' : p.low_stock ? '#eab308' : '#10b981' }}>
                              {p.has_variations
                                ? `${p.variations?.reduce((s, v) => s + v.stock_quantity, 0) ?? 0} un. (total)`
                                : `${p.stock_quantity} un.`
                              }
                            </span>
                          </td>
                          <td>
                            <span className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{p.min_stock} un.</span>
                          </td>
                          <td>
                            <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                              {formatCurrency(p.purchase_price)}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm font-semibold" style={{ color: '#c44df0' }}>
                              {formatCurrency((p.has_variations
                                ? p.variations?.reduce((s, v) => s + v.stock_quantity, 0) ?? 0
                                : p.stock_quantity) * p.purchase_price)}
                            </span>
                          </td>
                          <td>
                            {!p.has_variations && (
                              p.stock_quantity <= 0
                                ? <span className="text-xs font-bold px-2.5 py-1 rounded-md text-white" style={{ background: "#dc2626", whiteSpace: "nowrap" }}>Sem estoque</span>
                                : p.low_stock
                                ? <span className="text-xs font-bold px-2.5 py-1 rounded-md text-white" style={{ background: "#d97706" }}>Baixo</span>
                                : <span className="text-xs font-bold px-2.5 py-1 rounded-md text-white" style={{ background: "#16a34a" }}>OK</span>
                            )}
                          </td>
                          <td>
                            {!p.has_variations && (
                              <button onClick={() => openModal(p)}
                                className="btn-ghost text-xs px-2 py-1 gap-1" style={{ color: '#c44df0' }}>
                                <Plus size={13} /> Entrada
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Linhas das variações (expandidas) */}
                        {p.has_variations && expandedProducts.has(p.product_id) && p.variations?.map(variation => (
                          <tr key={variation.id} style={{ background: 'rgb(var(--bg-tertiary)/0.5)' }}>
                            <td>
                              <div className="flex items-center gap-2 pl-8">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#c44df0' }} />
                                <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                                  {variation.name}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                                {variation.sku ?? '—'}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm font-bold"
                                style={{ color: variation.stock_quantity <= 0 ? '#ef4444' : variation.stock_quantity <= p.min_stock ? '#eab308' : '#10b981' }}>
                                {variation.stock_quantity} un.
                              </span>
                            </td>
                            <td>—</td>
                            <td>
                              <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                                {formatCurrency(p.purchase_price)}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm font-semibold" style={{ color: '#c44df0' }}>
                                {formatCurrency(variation.stock_quantity * p.purchase_price)}
                              </span>
                            </td>
                            <td>
                              {variation.stock_quantity <= 0
                                ? <span className="text-xs font-bold px-2.5 py-1 rounded-md text-white" style={{ background: "#dc2626", whiteSpace: "nowrap" }}>Sem estoque</span>
                                : variation.stock_quantity <= p.min_stock
                                ? <span className="text-xs font-bold px-2.5 py-1 rounded-md text-white" style={{ background: "#d97706" }}>Baixo</span>
                                : <span className="text-xs font-bold px-2.5 py-1 rounded-md text-white" style={{ background: "#16a34a" }}>OK</span>
                              }
                            </td>
                            <td>
                              <button onClick={() => openModal(p, variation.id)}
                                className="btn-ghost text-xs px-2 py-1 gap-1" style={{ color: '#c44df0' }}>
                                <Plus size={13} /> Entrada
                              </button>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'historico' && (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Variação</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Custo unit.</th>
                  <th>Observação</th>
                  <th>Data e hora</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0" style={{ background: 'rgb(var(--bg-tertiary))' }}>
                          {m.image_url
                            ? <img src={m.image_url} alt={m.product_name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-sm">💄</div>
                          }
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                          {m.product_name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {m.variation_name
                        ? <span className="badge text-xs px-2 py-0.5" style={{ background: 'rgba(196,77,240,0.1)', color: '#c44df0' }}>
                            {m.variation_name}
                          </span>
                        : <span style={{ color: 'rgb(var(--text-muted))' }}>—</span>
                      }
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {m.type === 'entrada'
                          ? <TrendingUp size={14} style={{ color: '#10b981' }} />
                          : m.type === 'saida'
                          ? <TrendingDown size={14} style={{ color: '#ef4444' }} />
                          : <Settings2 size={14} style={{ color: '#c44df0' }} />
                        }
                        <span className="text-sm capitalize"
                          style={{ color: m.type === 'entrada' ? '#10b981' : m.type === 'saida' ? '#ef4444' : '#c44df0' }}>
                          {m.type === 'entrada' ? 'Entrada' : m.type === 'saida' ? 'Saída' : 'Ajuste'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm font-bold"
                        style={{ color: m.type === 'saida' ? '#ef4444' : '#10b981' }}>
                        {m.type === 'saida' ? '-' : '+'}{m.quantity} un.
                      </span>
                    </td>
                    <td>
                      <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                        {m.unit_cost ? formatCurrency(m.unit_cost) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{m.notes ?? '—'}</span>
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                        {formatDateTime(m.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal movimentação */}
      <Dialog.Root open={showModal} onOpenChange={setShowModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold"
                style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                {form.variation_id
                  ? `Entrada — ${selectedProduct?.variations?.find(v => v.id === form.variation_id)?.name}`
                  : 'Movimentar Estoque'
                }
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn-ghost p-2"><X size={18} /></button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Tipo */}
              <div className="flex gap-2">
                {(['entrada', 'ajuste'] as const).map(type => (
                  <button key={type} type="button"
                    onClick={() => setForm({ ...form, type })}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: form.type === type ? (type === 'entrada' ? '#10b981' : '#c44df0') : 'rgb(var(--bg-tertiary))',
                      color: form.type === type ? 'white' : 'rgb(var(--text-secondary))',
                    }}>
                    {type === 'entrada' ? '↑ Entrada' : '⚙ Ajuste'}
                  </button>
                ))}
              </div>

              {/* Produto (se abrir pelo botão geral) */}
              {!selectedProduct && (
                <div>
                  <label className="label">Produto *</label>
                  <select className="input-base" value={form.product_id}
                    onChange={e => {
                      const p = products.find(p => p.product_id === e.target.value)
                      setSelectedProduct(p ?? null)
                      setForm({ ...form, product_id: e.target.value, variation_id: '' })
                    }} required>
                    <option value="">Selecionar produto...</option>
                    {products.map(p => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} {p.has_variations ? '(tem variações)' : `(estoque: ${p.stock_quantity})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Se produto tem variações e não veio com variation_id específico */}
              {selectedProduct?.has_variations && !form.variation_id && (
                <div>
                  <label className="label">Variação *</label>
                  <select className="input-base" value={form.variation_id}
                    onChange={e => setForm({ ...form, variation_id: e.target.value })} required>
                    <option value="">Selecionar variação...</option>
                    {[...(selectedProduct.variations ?? [])].sort((a, b) =>
                      a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' })
                    ).map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} (estoque atual: {v.stock_quantity})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Info do produto/variação selecionado */}
              {selectedProduct && (
                <div className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
                    style={{ background: 'rgb(var(--bg-card))' }}>
                    {selectedProduct.image_url
                      ? <img src={selectedProduct.image_url} alt={selectedProduct.product_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl">💄</div>
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                      {selectedProduct.product_name}
                    </p>
                    {form.variation_id && (
                      <p className="text-xs" style={{ color: '#c44df0' }}>
                        {selectedProduct.variations?.find(v => v.id === form.variation_id)?.name}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                      Custo: {formatCurrency(selectedProduct.purchase_price)}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantidade *</label>
                  <input type="number" min="1" className="input-base" required
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    placeholder="Ex: 10" />
                </div>
                <div>
                  <label className="label">Custo unitário</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                    <input type="number" step="0.01" min="0" className="input-base pl-9"
                      value={form.unit_cost}
                      onChange={e => setForm({ ...form, unit_cost: e.target.value })}
                      placeholder="Opcional" />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Observação</label>
                <input type="text" className="input-base" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ex: Compra NF 001 — Fornecedor X" />
              </div>

              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="btn-secondary flex-1 justify-center">Cancelar</button>
                </Dialog.Close>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <><Loader2 size={15} className="animate-spin" />Salvando...</> : 'Registrar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}