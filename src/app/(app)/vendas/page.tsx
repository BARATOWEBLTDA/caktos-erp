'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, ShoppingCart, Search, Loader2, Trash2, X, Sparkles, Upload, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Platform, Product, Sale } from '@/types'
import toast from 'react-hot-toast'
import * as Dialog from '@radix-ui/react-dialog'

interface SaleItemForm {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  purchase_price: number
}

export default function VendasPage() {
  const supabase = createClient()
  const [sales, setSales] = useState<(Sale & { platform?: Platform })[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [products, setProducts] = useState<Pick<Product, 'id' | 'name' | 'sale_price' | 'purchase_price' | 'image_url'>[]>([])
  const [productsWithVariations, setProductsWithVariations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string>('')
  const [taxRate, setTaxRate] = useState(4)

  // AI image reading
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [aiPreview, setAiPreview] = useState<string | null>(null)
  const [unmatchedItems, setUnmatchedItems] = useState<Array<{ name: string; variation: string | null; sku: string | null }>>([])
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [orderCode, setOrderCode] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [shippingCost, setShippingCost] = useState('0')
  const [items, setItems] = useState<SaleItemForm[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [activeOptionalFees, setActiveOptionalFees] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState('0')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id, store:stores(tax_rate)')
        .eq('id', user!.id)
        .single()

      const sid = profile?.store_id
      const tr = (profile?.store as { tax_rate?: number } | null)?.tax_rate ?? 4
      setStoreId(sid)
      setTaxRate(tr)

      const [{ data: salesData }, { data: platformsData }, { data: productsData }, { data: productsWithVars }] = await Promise.all([
        supabase.from('sales').select('*, platform:platforms(*)').eq('store_id', sid).order('sale_date', { ascending: false }).limit(50),
        supabase.from('platforms').select('*').eq('store_id', sid).eq('is_active', true),
        supabase.from('products').select('id, name, sale_price, purchase_price, image_url').eq('store_id', sid).eq('is_active', true),
        supabase.from('products').select(`
          id, name, sku, purchase_price,
          platforms:product_platforms(platform_id, sale_price, is_active),
          variations:product_variations(id, name, sku)
        `).eq('store_id', sid).eq('is_active', true),
      ])

      setSales(salesData ?? [])
      setPlatforms(platformsData ?? [])
      setProducts(productsData ?? [])
      setProductsWithVariations(productsWithVars ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function analyzeImage(file: File) {
    setAnalyzingImage(true)
    setUnmatchedItems([])
    try {
      // Converter para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      setAiPreview(base64)

      const response = await fetch('/api/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          products: productsWithVariations,
        }),
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      const data = result.data

      // Identificar plataforma
      const platform = platforms.find(p => p.slug === data.platform)
      if (platform) handleSelectPlatform(platform)

      // Preencher código do pedido
      if (data.order_code) setOrderCode(data.order_code)

      // Preencher desconto
      if (data.discount > 0) setDiscount(data.discount.toString())

      // Preencher itens
      const newItems: SaleItemForm[] = []
      const unmatched: Array<{ name: string; variation: string | null; sku: string | null }> = []

      for (const item of data.items) {
        if (item.matched && item.product_id) {
          const product = products?.find(p => p.id === item.product_id)
          if (product) {
            newItems.push({
              product_id: product.id,
              product_name: product.name + (item.variation_name_found ? ` — ${item.variation_name_found}` : ''),
              quantity: item.quantity,
              unit_price: item.unit_price || product.sale_price,
              purchase_price: product.purchase_price,
            })
          }
        } else {
          unmatched.push({
            name: item.product_name_found,
            variation: item.variation_name_found,
            sku: item.sku_found,
          })
        }
      }

      if (newItems.length > 0) setItems(newItems)
      if (unmatched.length > 0) setUnmatchedItems(unmatched)

      if (newItems.length > 0) {
        toast.success(`${newItems.length} produto(s) identificado(s) automaticamente!`)
      }
      if (unmatched.length > 0) {
        toast.error(`${unmatched.length} produto(s) não encontrado(s) no cadastro.`)
      }

    } catch (err: unknown) {
      toast.error('Erro ao analisar imagem: ' + (err as Error).message)
    } finally {
      setAnalyzingImage(false)
    }
  }

  function handleSelectPlatform(platform: Platform) {
    setSelectedPlatform(platform)
    // Reset taxas opcionais
    const initial: Record<string, boolean> = {}
    platform.optional_fees?.forEach(f => { initial[f.id] = f.active })
    setActiveOptionalFees(initial)
    setShippingCost('0')
  }

  function addProduct(product: Pick<Product, 'id' | 'name' | 'sale_price' | 'purchase_price' | 'image_url'>) {
    const existing = items.find(i => i.product_id === product.id)
    if (existing) {
      setItems(items.map(i => i.product_id === product.id
        ? { ...i, quantity: i.quantity + 1 }
        : i
      ))
    } else {
      setItems([...items, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.sale_price,
        purchase_price: product.purchase_price,
      }])
    }
    setShowProductSearch(false)
    setProductSearch('')
  }

  // Cálculos
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const discountAmount = parseFloat(discount) || 0
  const subtotalAfterDiscount = Math.max(subtotal - discountAmount, 0)
  const commission = selectedPlatform
    ? (subtotalAfterDiscount * selectedPlatform.base_commission) / 100
    : 0
  const fixedFee = selectedPlatform?.fixed_fee ?? 0
  const optionalFeesAmount = selectedPlatform?.optional_fees?.reduce((s, f) => {
    return activeOptionalFees[f.id] ? s + (subtotalAfterDiscount * f.rate) / 100 : s
  }, 0) ?? 0
  const shipping = parseFloat(shippingCost) || 0
  const taxAmount = (subtotalAfterDiscount * taxRate) / 100
  const totalFees = commission + fixedFee + optionalFeesAmount + shipping + taxAmount
  const totalCost = items.reduce((s, i) => s + i.purchase_price * i.quantity, 0)
  const netProfit = subtotalAfterDiscount - totalCost - totalFees
  const total = subtotalAfterDiscount

  async function handleSave() {
    if (!selectedPlatform || items.length === 0) {
      toast.error('Selecione uma plataforma e adicione pelo menos um produto')
      return
    }
    setSaving(true)

    try {
      const optionalFeesApplied = selectedPlatform.optional_fees
        ?.filter(f => activeOptionalFees[f.id])
        .map(f => ({ name: f.name, rate: f.rate, amount: (subtotal * f.rate) / 100 }))
        ?? []

      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        store_id: storeId,
        platform_id: selectedPlatform.id,
        order_code: orderCode || null,
        sale_date: new Date(saleDate).toISOString(),
        subtotal,
        shipping_cost: shipping,
        discount: discountAmount,
        total,
        commission_rate: selectedPlatform.base_commission,
        fixed_fee: fixedFee,
        optional_fees_applied: optionalFeesApplied,
        tax_rate: taxRate,
        total_fees: totalFees,
        tax_amount: taxAmount,
        net_profit: netProfit,
        notes: notes || null,
      }).select().single()

      if (saleError) throw saleError

      // Inserir itens
      await supabase.from('sale_items').insert(
        items.map(item => ({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          purchase_price: item.purchase_price,
          subtotal: item.unit_price * item.quantity,
        }))
      )

      // Debitar estoque
      await supabase.from('stock_movements').insert(
        items.map(item => ({
          store_id: storeId,
          product_id: item.product_id,
          type: 'saida',
          quantity: item.quantity,
          reference_id: sale.id,
          reference_type: 'sale',
          notes: `Venda #${orderCode || sale.id.slice(0, 8)}`,
        }))
      )

      toast.success('Venda registrada com sucesso!')
      setShowForm(false)
      resetForm()
      // Reload
      const { data: updated } = await supabase.from('sales').select('*, platform:platforms(*)').eq('store_id', storeId).order('sale_date', { ascending: false }).limit(50)
      setSales(updated ?? [])
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setSelectedPlatform(null)
    setOrderCode('')
    setSaleDate(new Date().toISOString().split('T')[0])
    setShippingCost('0')
    setItems([])
    setActiveOptionalFees({})
    setNotes('')
    setDiscount('0')
    setAiPreview(null)
    setUnmatchedItems([])
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-xl">Vendas</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {sales.length} vendas recentes
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} />
          Nova venda
        </button>
      </div>

      {/* Lista de vendas */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl shimmer" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="text-base font-medium" style={{ color: 'rgb(var(--text-muted))' }}>
            Nenhuma venda registrada
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Data</th>
                  <th>Plataforma</th>
                  <th>Total</th>
                  <th>Taxas</th>
                  <th>Lucro</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td>
                      <span className="font-mono text-xs"
                        style={{ color: 'rgb(var(--text-muted))' }}>
                        {sale.order_code ?? `#${sale.id.slice(0, 8)}`}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm">{formatDate(sale.sale_date)}</span>
                    </td>
                    <td>
                      {sale.platform && (
                        <span className="badge text-xs font-medium text-white px-2.5 py-1"
                          style={{ background: sale.platform.color }}>
                          {sale.platform.name}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                        {formatCurrency(sale.total)}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-red-400">
                        -{formatCurrency(sale.total_fees)}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm font-bold"
                        style={{ color: sale.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatCurrency(sale.net_profit)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de nova venda */}
      <Dialog.Root open={showForm} onOpenChange={(o) => { if (!o) resetForm(); setShowForm(o) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl animate-scale-in"
            style={{
              background: 'rgb(var(--bg-card))',
              border: '1px solid rgb(var(--border))',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold"
                style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                Registrar Venda
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn-ghost p-2"><X size={18} /></button>
              </Dialog.Close>
            </div>

            <div className="p-6 space-y-5">

              {/* Botão IA — Analisar Print */}
              <div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) analyzeImage(file)
                  }}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={analyzingImage}
                  className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-3 text-sm font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(196,77,240,0.1), rgba(244,63,94,0.1))',
                    border: '1px dashed rgba(196,77,240,0.4)',
                    color: '#c44df0',
                  }}>
                  {analyzingImage ? (
                    <><Loader2 size={16} className="animate-spin" />Analisando imagem com IA...</>
                  ) : (
                    <><Sparkles size={16} /><Upload size={16} />Colar / Upload do print do pedido — IA preenche automaticamente</>
                  )}
                </button>

                {/* Preview da imagem analisada */}
                {aiPreview && !analyzingImage && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl p-2"
                    style={{ background: 'rgb(var(--bg-tertiary))' }}>
                    <img src={aiPreview} alt="print analisado" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: '#10b981' }}>✅ Imagem analisada com sucesso</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Confira os dados abaixo e ajuste se necessário</p>
                    </div>
                    <button onClick={() => { setAiPreview(null); setUnmatchedItems([]) }}
                      className="p-1 shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Itens não encontrados */}
                {unmatchedItems.length > 0 && (
                  <div className="mt-2 rounded-xl p-3 space-y-1"
                    style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                    <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#eab308' }}>
                      <AlertCircle size={13} /> Produtos não encontrados no cadastro — adicione manualmente:
                    </p>
                    {unmatchedItems.map((item, i) => (
                      <p key={i} className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                        • {item.name}{item.variation ? ` — ${item.variation}` : ''}{item.sku ? ` (SKU: ${item.sku})` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Plataforma + Data + Código */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Plataforma *</label>
                  <select
                    className="input-base"
                    value={selectedPlatform?.id ?? ''}
                    onChange={e => {
                      const p = platforms.find(p => p.id === e.target.value)
                      if (p) handleSelectPlatform(p)
                    }}
                  >
                    <option value="">Selecionar...</option>
                    {platforms.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Data da venda</label>
                  <input
                    type="date"
                    className="input-base"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Código do pedido</label>
                  <input
                    type="text"
                    className="input-base"
                    value={orderCode}
                    onChange={e => setOrderCode(e.target.value)}
                    placeholder="Ex: 24012345678"
                  />
                </div>
              </div>

              {/* Taxas opcionais (Shopee) */}
              {selectedPlatform?.has_optional_fees && (selectedPlatform.optional_fees?.length ?? 0) > 0 && (
                <div>
                  <label className="label">Taxas opcionais</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedPlatform.optional_fees?.map(fee => (
                      <label key={fee.id} className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2"
                        style={{
                          background: activeOptionalFees[fee.id] ? 'rgba(196, 77, 240, 0.1)' : 'rgb(var(--bg-tertiary))',
                          border: `1px solid ${activeOptionalFees[fee.id] ? 'rgba(196, 77, 240, 0.3)' : 'transparent'}`,
                        }}>
                        <input
                          type="checkbox"
                          className="accent-brand-500"
                          checked={activeOptionalFees[fee.id] ?? false}
                          onChange={e => setActiveOptionalFees(prev => ({ ...prev, [fee.id]: e.target.checked }))}
                        />
                        <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                          {fee.name} (+{fee.rate}%)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Frete variável (ML) */}
              {selectedPlatform?.has_variable_shipping && (
                <div className="max-w-xs">
                  <label className="label">Frete (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-base pl-9"
                      value={shippingCost}
                      onChange={e => setShippingCost(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Produtos */}
              <div>
                <label className="label">Produtos *</label>

                {/* Busca de produto */}
                <div className="relative">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgb(var(--text-muted))' }} />
                    <input
                      type="text"
                      placeholder="Buscar produto para adicionar..."
                      className="input-base pl-9"
                      value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); setShowProductSearch(true) }}
                      onFocus={() => setShowProductSearch(true)}
                    />
                  </div>
                  {showProductSearch && productSearch && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-2xl"
                      style={{
                        background: 'rgb(var(--bg-card))',
                        border: '1px solid rgb(var(--border))',
                        boxShadow: 'var(--shadow-modal)',
                      }}>
                      {filteredProducts.slice(0, 8).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[rgb(var(--bg-tertiary))] text-left transition-colors"
                          onClick={() => addProduct(p)}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
                            style={{ background: 'rgb(var(--bg-tertiary))' }}>
                            {p.image_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-sm">💄</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>
                              {p.name}
                            </p>
                            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                              {formatCurrency(p.sale_price)}
                            </p>
                          </div>
                        </button>
                      ))}
                      {filteredProducts.length === 0 && (
                        <p className="text-sm text-center py-4" style={{ color: 'rgb(var(--text-muted))' }}>
                          Nenhum produto encontrado
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de itens */}
                {items.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {items.map((item, index) => (
                      <div key={item.product_id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                        style={{ background: 'rgb(var(--bg-tertiary))' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>
                            {item.product_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                            style={{ background: 'rgb(var(--border))' }}
                            onClick={() => setItems(items.map((it, i) => i === index && it.quantity > 1 ? { ...it, quantity: it.quantity - 1 } : it))}
                          >-</button>
                          <span className="w-8 text-center text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                            {item.quantity}
                          </span>
                          <button type="button"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                            style={{ background: 'rgb(var(--border))' }}
                            onClick={() => setItems(items.map((it, i) => i === index ? { ...it, quantity: it.quantity + 1 } : it))}
                          >+</button>
                        </div>
                        <span className="text-sm font-semibold min-w-20 text-right" style={{ color: '#c44df0' }}>
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                        <button type="button" className="text-red-400 hover:text-red-500 transition-colors"
                          onClick={() => setItems(items.filter((_, i) => i !== index))}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cupom / Desconto */}
              {items.length > 0 && (
                <div className="max-w-xs">
                  <label className="label">Cupom / Desconto (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: 'rgb(var(--text-muted))' }}>-R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-base pl-10"
                      value={discount}
                      onChange={e => setDiscount(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              )}

              {/* Resumo */}
              {items.length > 0 && selectedPlatform && (
                <div className="rounded-2xl p-4 space-y-2"
                  style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
                    Resumo da venda
                  </h3>
                  {[
                    { label: 'Subtotal', value: subtotal, color: 'rgb(var(--text-primary))' },
                    discountAmount > 0 && { label: 'Cupom / Desconto', value: -discountAmount, color: '#8b5cf6' },
                    { label: 'Custo (CMV)', value: -totalCost, color: '#ef4444' },
                    { label: `Comissão ${selectedPlatform.name} (${selectedPlatform.base_commission}%)`, value: -commission, color: '#f97316' },
                    selectedPlatform.fixed_fee > 0 && { label: 'Taxa fixa', value: -fixedFee, color: '#f97316' },
                    optionalFeesAmount > 0 && { label: 'Taxas opcionais', value: -optionalFeesAmount, color: '#f97316' },
                    shipping > 0 && { label: 'Frete', value: -shipping, color: '#f97316' },
                    { label: `Imposto Simples (${taxRate}%)`, value: -taxAmount, color: '#eab308' },
                  ].filter(Boolean).map((row: { label: string; value: number; color: string } | false) => {
                    if (!row) return null
                    return (
                      <div key={row.label} className="flex justify-between text-sm">
                        <span style={{ color: 'rgb(var(--text-muted))' }}>{row.label}</span>
                        <span style={{ color: row.color }}>
                          {row.value < 0 ? '-' : ''}{formatCurrency(Math.abs(row.value))}
                        </span>
                      </div>
                    )
                  })}
                  <div className="border-t pt-2 mt-2 flex justify-between" style={{ borderColor: 'rgb(var(--border-strong))' }}>
                    <span className="text-sm font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                      Lucro líquido
                    </span>
                    <span className="text-base font-bold" style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="label">Observações</label>
                <textarea
                  className="input-base resize-none"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observações da venda..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="btn-secondary flex-1 justify-center">
                    Cancelar
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || items.length === 0 || !selectedPlatform}
                  className="btn-primary flex-1 justify-center"
                >
                  {saving
                    ? <><Loader2 size={16} className="animate-spin" />Salvando...</>
                    : 'Registrar venda'
                  }
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}