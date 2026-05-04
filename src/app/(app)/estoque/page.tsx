'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Boxes, TrendingUp, TrendingDown, Settings2, Search, Loader2, X, AlertTriangle } from 'lucide-react'
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
}

interface StockMovement {
  id: string
  type: string
  quantity: number
  unit_cost: number | null
  notes: string | null
  created_at: string
  product_name?: string
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

  const [form, setForm] = useState({
    product_id: '',
    type: 'entrada' as 'entrada' | 'ajuste',
    quantity: '',
    unit_cost: '',
    notes: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user!.id).single()
    const sid = profile!.store_id
    setStoreId(sid)

    const [{ data: stockData }, { data: movementsData }] = await Promise.all([
      supabase.from('current_stock').select('*').eq('store_id', sid).order('product_name'),
      supabase
        .from('stock_movements')
        .select('id, type, quantity, unit_cost, notes, created_at, product:products(name, image_url)')
        .eq('store_id', sid)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    setProducts(stockData ?? [])
    setMovements(
      (movementsData ?? []).map((m: any) => ({
        ...m,
        product_name: m.product?.name,
        image_url: m.product?.image_url,
      }))
    )
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.product_id || !form.quantity) return
    setSaving(true)
    try {
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
      toast.success('Movimentação registrada!')
      setShowModal(false)
      setForm({ product_id: '', type: 'entrada', quantity: '', unit_cost: '', notes: '' })
      load()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = products.filter(p =>
    !search || p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = products.reduce((s, p) => s + p.stock_quantity * p.purchase_price, 0)
  const lowStockCount = products.filter(p => p.low_stock).length
  const totalItems = products.reduce((s, p) => s + p.stock_quantity, 0)

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-xl">Estoque</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {products.length} produtos · {totalItems} unidades no total
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
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
        <button
          onClick={() => setTab('estoque')}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
          style={{
            background: tab === 'estoque' ? 'rgb(var(--bg-card))' : 'transparent',
            color: tab === 'estoque' ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
            boxShadow: tab === 'estoque' ? 'var(--shadow-card)' : 'none',
          }}>
          Posição atual
        </button>
        <button
          onClick={() => setTab('historico')}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
          style={{
            background: tab === 'historico' ? 'rgb(var(--bg-card))' : 'transparent',
            color: tab === 'historico' ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
            boxShadow: tab === 'historico' ? 'var(--shadow-card)' : 'none',
          }}>
          Histórico de entradas
        </button>
      </div>

      {tab === 'estoque' && (
        <>
          {/* Busca */}
          <div className="relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
            <input type="text" placeholder="Buscar produto..." className="input-base pl-9"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Tabela estilo Excel */}
          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl shimmer" />)}</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-container">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>SKU</th>
                      <th>Estoque atual</th>
                      <th>Mínimo</th>
                      <th>Custo unit.</th>
                      <th>Valor total</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.product_id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0"
                              style={{ background: 'rgb(var(--bg-tertiary))' }}>
                              {p.image_url
                                ? <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-base">💄</div>
                              }
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                              {p.product_name}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                            {p.sku ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm font-bold"
                            style={{ color: p.stock_quantity <= 0 ? '#ef4444' : p.low_stock ? '#eab308' : '#10b981' }}>
                            {p.stock_quantity} un.
                          </span>
                        </td>
                        <td>
                          <span className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                            {p.min_stock} un.
                          </span>
                        </td>
                        <td>
                          <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                            {formatCurrency(p.purchase_price)}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm font-semibold" style={{ color: '#c44df0' }}>
                            {formatCurrency(p.stock_quantity * p.purchase_price)}
                          </span>
                        </td>
                        <td>
                          {p.stock_quantity <= 0 ? (
                            <span className="badge text-xs px-2 py-0.5 text-red-500 bg-red-500/10">Sem estoque</span>
                          ) : p.low_stock ? (
                            <span className="badge text-xs px-2 py-0.5 text-yellow-500 bg-yellow-500/10 gap-1">
                              <AlertTriangle size={10} /> Estoque baixo
                            </span>
                          ) : (
                            <span className="badge text-xs px-2 py-0.5 text-green-500 bg-green-500/10">OK</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => { setForm(f => ({ ...f, product_id: p.product_id })); setShowModal(true) }}
                            className="btn-ghost text-xs px-2 py-1 gap-1"
                            style={{ color: '#c44df0' }}>
                            <Plus size={13} /> Entrada
                          </button>
                        </td>
                      </tr>
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
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
                          style={{ background: 'rgb(var(--bg-tertiary))' }}>
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
                      <div className="flex items-center gap-1.5">
                        {m.type === 'entrada'
                          ? <TrendingUp size={14} style={{ color: '#10b981' }} />
                          : m.type === 'saida'
                          ? <TrendingDown size={14} style={{ color: '#ef4444' }} />
                          : <Settings2 size={14} style={{ color: '#c44df0' }} />
                        }
                        <span className="text-sm capitalize"
                          style={{ color: m.type === 'entrada' ? '#10b981' : m.type === 'saida' ? '#ef4444' : '#c44df0' }}>
                          {m.type === 'entrada' ? 'Entrada' : m.type === 'saida' ? 'Saída (venda)' : 'Ajuste'}
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
                      <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                        {m.notes ?? '—'}
                      </span>
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
                Movimentar Estoque
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
                      background: form.type === type
                        ? type === 'entrada' ? '#10b981' : '#c44df0'
                        : 'rgb(var(--bg-tertiary))',
                      color: form.type === type ? 'white' : 'rgb(var(--text-secondary))',
                    }}>
                    {type === 'entrada' ? '↑ Entrada' : '⚙ Ajuste'}
                  </button>
                ))}
              </div>

              {/* Produto */}
              <div>
                <label className="label">Produto *</label>
                <select className="input-base" value={form.product_id}
                  onChange={e => setForm({ ...form, product_id: e.target.value })} required>
                  <option value="">Selecionar produto...</option>
                  {products.map(p => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name} (estoque atual: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

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