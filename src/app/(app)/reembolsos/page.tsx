'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, RefreshCcw, Loader2, X, Search } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Refund, Sale, Platform } from '@/types'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  aberto: 'text-yellow-500 bg-yellow-500/10',
  em_analise: 'text-blue-500 bg-blue-500/10',
  aprovado: 'text-green-500 bg-green-500/10',
  rejeitado: 'text-red-500 bg-red-500/10',
  concluido: 'text-gray-400 bg-gray-500/10',
}

const STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  concluido: 'Concluído',
}

const RESP_LABELS: Record<string, string> = {
  plataforma: 'Plataforma',
  fornecedor: 'Fornecedor',
  loja: 'Loja',
  cliente: 'Cliente',
}

export default function ReembolsosPage() {
  const supabase = createClient()
  const [refunds, setRefunds] = useState<(Refund & { platform?: Platform })[]>([])
  const [recentSales, setRecentSales] = useState<(Sale & { platform?: Platform })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  const [form, setForm] = useState({
    sale_id: '',
    reason: '',
    amount: '',
    status: 'aberto' as Refund['status'],
    responsibility: 'loja' as Refund['responsibility'],
    restock: false,
    notes: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user!.id).single()
    setStoreId(profile!.store_id)

    const [{ data: refundsData }, { data: salesData }] = await Promise.all([
      supabase.from('refunds').select('*, sale:sales(order_code, platform:platforms(name, color))').eq('store_id', profile!.store_id).order('created_at', { ascending: false }),
      supabase.from('sales').select('*, platform:platforms(name, color)').eq('store_id', profile!.store_id).order('sale_date', { ascending: false }).limit(100),
    ])

    setRefunds(refundsData ?? [])
    setRecentSales(salesData ?? [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('refunds').insert({
        store_id: storeId,
        sale_id: form.sale_id || null,
        reason: form.reason,
        amount: parseFloat(form.amount) || 0,
        status: form.status,
        responsibility: form.responsibility,
        restock: form.restock,
        notes: form.notes || null,
      })
      if (error) throw error
      toast.success('Reembolso registrado!')
      setShowForm(false)
      load()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: Refund['status']) {
    await supabase.from('refunds').update({
      status,
      resolved_at: ['aprovado', 'rejeitado', 'concluido'].includes(status) ? new Date().toISOString() : null,
    }).eq('id', id)
    toast.success('Status atualizado!')
    load()
  }

  const filtered = refunds.filter(r => statusFilter === 'todos' || r.status === statusFilter)

  const counts = {
    total: refunds.length,
    aberto: refunds.filter(r => r.status === 'aberto').length,
    em_analise: refunds.filter(r => r.status === 'em_analise').length,
    concluido: refunds.filter(r => r.status === 'concluido').length,
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-xl">Reembolsos</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {counts.total} reembolsos · {counts.aberto} abertos
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Novo reembolso
        </button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'aberto', label: 'Abertos' },
          { key: 'em_analise', label: 'Em Análise' },
          { key: 'aprovado', label: 'Aprovados' },
          { key: 'rejeitado', label: 'Rejeitados' },
          { key: 'concluido', label: 'Concluídos' },
        ].map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`badge px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              statusFilter === f.key ? 'bg-brand-500 text-white' : 'bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <RefreshCcw size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Nenhum reembolso encontrado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Motivo</th>
                  <th>Valor</th>
                  <th>Responsabilidade</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(refund => {
                  const sale = refund.sale as { order_code?: string; platform?: { name: string; color: string } } | null
                  return (
                    <tr key={refund.id}>
                      <td>
                        <div>
                          <p className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                            {sale?.order_code ?? '—'}
                          </p>
                          {sale?.platform && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block"
                              style={{ background: `${sale.platform.color}20`, color: sale.platform.color }}>
                              {sale.platform.name}
                            </span>
                          )}
                          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                            {formatDate(refund.created_at)}
                          </p>
                        </div>
                      </td>
                      <td>
                        <p className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                          {refund.reason}
                        </p>
                        {refund.notes && (
                          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{refund.notes}</p>
                        )}
                      </td>
                      <td>
                        <span className="text-sm font-bold text-red-400">
                          -{formatCurrency(refund.amount)}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {RESP_LABELS[refund.responsibility]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-xs px-2.5 py-1 font-medium ${STATUS_COLORS[refund.status]}`}>
                          {STATUS_LABELS[refund.status]}
                        </span>
                      </td>
                      <td>
                        {refund.status !== 'concluido' && refund.status !== 'rejeitado' && (
                          <select
                            className="text-xs rounded-lg px-2 py-1 outline-none cursor-pointer"
                            style={{ background: 'rgb(var(--bg-tertiary))', border: '1px solid rgb(var(--border))', color: 'rgb(var(--text-primary))' }}
                            value={refund.status}
                            onChange={e => updateStatus(refund.id, e.target.value as Refund['status'])}>
                            <option value="aberto">Aberto</option>
                            <option value="em_analise">Em Análise</option>
                            <option value="aprovado">Aprovado</option>
                            <option value="rejeitado">Rejeitado</option>
                            <option value="concluido">Concluído</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal novo reembolso */}
      <Dialog.Root open={showForm} onOpenChange={setShowForm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold"
                style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                Registrar Reembolso
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn-ghost p-2"><X size={18} /></button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="label">Venda relacionada</label>
                <select className="input-base" value={form.sale_id}
                  onChange={e => setForm({ ...form, sale_id: e.target.value })}>
                  <option value="">Sem venda vinculada</option>
                  {recentSales.slice(0, 50).map(s => {
                    const platform = s.platform as { name: string } | null
                    return (
                      <option key={s.id} value={s.id}>
                        {s.order_code ?? s.id.slice(0, 8)} — {platform?.name} — {formatCurrency(s.total)} — {formatDate(s.sale_date)}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="label">Motivo *</label>
                <input type="text" className="input-base" value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="Ex: Produto com defeito" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valor do reembolso *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                    <input type="number" step="0.01" min="0" className="input-base pl-9" value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="label">Responsabilidade</label>
                  <select className="input-base" value={form.responsibility}
                    onChange={e => setForm({ ...form, responsibility: e.target.value as Refund['responsibility'] })}>
                    <option value="loja">Loja</option>
                    <option value="plataforma">Plataforma</option>
                    <option value="fornecedor">Fornecedor</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Status inicial</label>
                <select className="input-base" value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as Refund['status'] })}>
                  <option value="aberto">Aberto</option>
                  <option value="em_analise">Em Análise</option>
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative shrink-0">
                  <input type="checkbox" className="sr-only" checked={form.restock}
                    onChange={e => setForm({ ...form, restock: e.target.checked })} />
                  <div className={`w-10 h-5 rounded-full transition-colors ${form.restock ? 'bg-brand-500' : 'bg-[rgb(var(--border-strong))]'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow m-0.5 transition-transform ${form.restock ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>Repor produto ao estoque</span>
              </label>

              <div>
                <label className="label">Observações</label>
                <textarea className="input-base resize-none" rows={2} value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
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
