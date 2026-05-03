'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, BarChart3, TrendingUp, TrendingDown, Loader2, X, AlertTriangle, Check } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { formatCurrency, formatDate, accountStatusLabel, accountStatusColor } from '@/lib/utils'
import type { FinancialTransaction, FinancialCategory, AccountsPayable, AccountsReceivable, Platform, Supplier } from '@/types'
import toast from 'react-hot-toast'

export default function FinanceiroPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState('')
  const [tab, setTab] = useState('movimentacoes')

  const [transactions, setTransactions] = useState<(FinancialTransaction & { category?: FinancialCategory; platform?: Platform })[]>([])
  const [categories, setCategories] = useState<FinancialCategory[]>([])
  const [payables, setPayables] = useState<(AccountsPayable & { supplier?: Supplier })[]>([])
  const [receivables, setReceivables] = useState<(AccountsReceivable & { platform?: Platform })[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [suppliers, setSuppliers] = useState<Pick<Supplier, 'id' | 'name'>[]>([])

  // Modal estados
  const [showTxForm, setShowTxForm] = useState(false)
  const [showPayableForm, setShowPayableForm] = useState(false)
  const [showReceivableForm, setShowReceivableForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [txForm, setTxForm] = useState({ type: 'entrada' as 'entrada' | 'saida', amount: '', description: '', category_id: '', platform_id: '', transaction_date: new Date().toISOString().split('T')[0] })
  const [payableForm, setPayableForm] = useState({ description: '', amount: '', due_date: '', supplier_id: '', category_id: '', notes: '', recurrent: false, recurrence_months: '' })
  const [receivableForm, setReceivableForm] = useState({ description: '', amount: '', due_date: '', platform_id: '', notes: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user!.id).single()
    const sid = profile!.store_id
    setStoreId(sid)

    const [txRes, catRes, payRes, recRes, platRes, supRes] = await Promise.all([
      supabase.from('financial_transactions').select('*, category:financial_categories(*), platform:platforms(name, color)').eq('store_id', sid).order('transaction_date', { ascending: false }).limit(100),
      supabase.from('financial_categories').select('*').eq('store_id', sid).eq('is_active', true),
      supabase.from('accounts_payable').select('*, supplier:suppliers(name)').eq('store_id', sid).order('due_date').limit(100),
      supabase.from('accounts_receivable').select('*, platform:platforms(name, color)').eq('store_id', sid).order('due_date').limit(100),
      supabase.from('platforms').select('*').eq('store_id', sid).eq('is_active', true),
      supabase.from('suppliers').select('id, name').eq('store_id', sid).eq('is_active', true),
    ])

    setTransactions(txRes.data ?? [])
    setCategories(catRes.data ?? [])
    setPayables(payRes.data ?? [])
    setReceivables(recRes.data ?? [])
    setPlatforms(platRes.data ?? [])
    setSuppliers(supRes.data ?? [])
    setLoading(false)
  }

  // Resumo do mês
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
  const txMonth = transactions.filter(t => new Date(t.transaction_date) >= monthStart)
  const entradas = txMonth.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0)
  const saidas = txMonth.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0)
  const saldo = entradas - saidas

  async function saveTx(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('financial_transactions').insert({
        store_id: storeId,
        type: txForm.type,
        amount: parseFloat(txForm.amount) || 0,
        description: txForm.description,
        category_id: txForm.category_id || null,
        platform_id: txForm.platform_id || null,
        transaction_date: new Date(txForm.transaction_date).toISOString(),
      })
      if (error) throw error
      toast.success('Movimentação registrada!')
      setShowTxForm(false)
      load()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  async function savePayable(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('accounts_payable').insert({
        store_id: storeId,
        description: payableForm.description,
        amount: parseFloat(payableForm.amount) || 0,
        due_date: payableForm.due_date,
        supplier_id: payableForm.supplier_id || null,
        category_id: payableForm.category_id || null,
        notes: payableForm.notes || null,
        recurrent: payableForm.recurrent,
        recurrence_months: payableForm.recurrent && payableForm.recurrence_months ? parseInt(payableForm.recurrence_months) : null,
      })
      if (error) throw error
      toast.success('Conta a pagar registrada!')
      setShowPayableForm(false)
      load()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  async function saveReceivable(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('accounts_receivable').insert({
        store_id: storeId,
        description: receivableForm.description,
        amount: parseFloat(receivableForm.amount) || 0,
        due_date: receivableForm.due_date,
        platform_id: receivableForm.platform_id || null,
        notes: receivableForm.notes || null,
      })
      if (error) throw error
      toast.success('Conta a receber registrada!')
      setShowReceivableForm(false)
      load()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  async function markPayablePaid(id: string) {
    await supabase.from('accounts_payable').update({ status: 'pago', paid_at: new Date().toISOString() }).eq('id', id)
    toast.success('Marcado como pago!')
    load()
  }

  async function markReceivableReceived(id: string) {
    await supabase.from('accounts_receivable').update({ status: 'pago', received_at: new Date().toISOString() }).eq('id', id)
    toast.success('Marcado como recebido!')
    load()
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="section-title text-xl">Financeiro</h1>
        <div className="flex gap-2">
          {tab === 'movimentacoes' && (
            <button onClick={() => setShowTxForm(true)} className="btn-primary">
              <Plus size={16} /> Nova movimentação
            </button>
          )}
          {tab === 'pagar' && (
            <button onClick={() => setShowPayableForm(true)} className="btn-primary">
              <Plus size={16} /> Conta a pagar
            </button>
          )}
          {tab === 'receber' && (
            <button onClick={() => setShowReceivableForm(true)} className="btn-primary">
              <Plus size={16} /> Conta a receber
            </button>
          )}
        </div>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Entradas do mês', value: entradas, color: '#10b981', icon: TrendingUp },
          { label: 'Saídas do mês', value: saidas, color: '#ef4444', icon: TrendingDown },
          { label: 'Saldo do mês', value: saldo, color: saldo >= 0 ? '#c44df0' : '#ef4444', icon: BarChart3 },
        ].map(item => {
          const Icon = item.icon
          return (
            <div key={item.label} className="card p-4">
              <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>{item.label}</p>
              <p className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: item.color }}>
                {formatCurrency(item.value)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: 'rgb(var(--bg-tertiary))' }}>
          {[
            { key: 'movimentacoes', label: 'Movimentações' },
            { key: 'pagar', label: `Contas a Pagar (${payables.filter(p => p.status === 'pendente' || p.status === 'vencido').length})` },
            { key: 'receber', label: `A Receber (${receivables.filter(r => r.status === 'pendente').length})` },
          ].map(t => (
            <Tabs.Trigger key={t.key} value={t.key}
              className="flex-1 py-2 text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-surface-800 data-[state=active]:shadow-sm"
              style={{ color: tab === t.key ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))' }}>
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Movimentações */}
        <Tabs.Content value="movimentacoes">
          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl shimmer" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Nenhuma movimentação registrada</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-container">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => {
                      const cat = tx.category as FinancialCategory | null
                      const plat = tx.platform as { name: string; color: string } | null
                      return (
                        <tr key={tx.id}>
                          <td><span className="text-xs">{formatDate(tx.transaction_date)}</span></td>
                          <td>
                            <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{tx.description}</p>
                            {plat && (
                              <span className="text-xs" style={{ color: plat.color }}>{plat.name}</span>
                            )}
                          </td>
                          <td>
                            {cat && (
                              <span className="badge text-xs px-2 py-0.5" style={{ background: `${cat.color}20`, color: cat.color }}>
                                {cat.name}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`badge text-xs px-2.5 py-1 font-medium ${tx.type === 'entrada' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                              {tx.type === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm font-bold" style={{ color: tx.type === 'entrada' ? '#10b981' : '#ef4444' }}>
                              {tx.type === 'entrada' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Tabs.Content>

        {/* Contas a pagar */}
        <Tabs.Content value="pagar">
          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Descrição</th>
                    <th>Fornecedor</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map(p => {
                    const supplier = p.supplier as { name?: string } | null
                    const isOverdue = p.status === 'vencido'
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {isOverdue && <AlertTriangle size={13} style={{ color: '#ef4444' }} />}
                            <span className="text-xs" style={{ color: isOverdue ? '#ef4444' : 'rgb(var(--text-primary))' }}>
                              {formatDate(p.due_date)}
                            </span>
                          </div>
                        </td>
                        <td><p className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{p.description}</p></td>
                        <td><p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{supplier?.name ?? '—'}</p></td>
                        <td><span className="text-sm font-bold text-red-400">{formatCurrency(p.amount)}</span></td>
                        <td>
                          <span className={`badge text-xs px-2.5 py-1 font-medium ${accountStatusColor[p.status]}`}>
                            {accountStatusLabel[p.status]}
                          </span>
                        </td>
                        <td>
                          {p.status !== 'pago' && p.status !== 'cancelado' && (
                            <button onClick={() => markPayablePaid(p.id)}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                              <Check size={12} /> Pago
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Content>

        {/* Contas a receber */}
        <Tabs.Content value="receber">
          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Descrição</th>
                    <th>Plataforma</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map(r => {
                    const plat = r.platform as { name: string; color: string } | null
                    return (
                      <tr key={r.id}>
                        <td><span className="text-xs">{formatDate(r.due_date)}</span></td>
                        <td><p className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{r.description}</p></td>
                        <td>
                          {plat && (
                            <span className="text-xs font-medium" style={{ color: plat.color }}>{plat.name}</span>
                          )}
                        </td>
                        <td><span className="text-sm font-bold" style={{ color: '#10b981' }}>{formatCurrency(r.amount)}</span></td>
                        <td>
                          <span className={`badge text-xs px-2.5 py-1 font-medium ${accountStatusColor[r.status]}`}>
                            {accountStatusLabel[r.status]}
                          </span>
                        </td>
                        <td>
                          {r.status !== 'pago' && r.status !== 'cancelado' && (
                            <button onClick={() => markReceivableReceived(r.id)}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg"
                              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                              <Check size={12} /> Recebido
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Modal: Nova Movimentação */}
      <Dialog.Root open={showTxForm} onOpenChange={setShowTxForm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                Nova Movimentação
              </Dialog.Title>
              <Dialog.Close asChild><button className="btn-ghost p-2"><X size={18} /></button></Dialog.Close>
            </div>
            <form onSubmit={saveTx} className="p-5 space-y-4">
              {/* Tipo */}
              <div className="flex gap-2">
                {(['entrada', 'saida'] as const).map(type => (
                  <button key={type} type="button" onClick={() => setTxForm({ ...txForm, type })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${txForm.type === type ? 'text-white' : ''}`}
                    style={{
                      background: txForm.type === type ? (type === 'entrada' ? '#10b981' : '#ef4444') : 'rgb(var(--bg-tertiary))',
                      color: txForm.type === type ? 'white' : 'rgb(var(--text-secondary))',
                    }}>
                    {type === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                  </button>
                ))}
              </div>
              <div>
                <label className="label">Valor *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                  <input type="number" step="0.01" min="0" className="input-base pl-9" value={txForm.amount}
                    onChange={e => setTxForm({ ...txForm, amount: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Descrição *</label>
                <input type="text" className="input-base" value={txForm.description}
                  onChange={e => setTxForm({ ...txForm, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Categoria</label>
                  <select className="input-base" value={txForm.category_id}
                    onChange={e => setTxForm({ ...txForm, category_id: e.target.value })}>
                    <option value="">Sem categoria</option>
                    {categories.filter(c => c.type === txForm.type).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Data</label>
                  <input type="date" className="input-base" value={txForm.transaction_date}
                    onChange={e => setTxForm({ ...txForm, transaction_date: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild><button type="button" className="btn-secondary flex-1 justify-center">Cancelar</button></Dialog.Close>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <><Loader2 size={15} className="animate-spin" />Salvando...</> : 'Registrar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal: Conta a Pagar */}
      <Dialog.Root open={showPayableForm} onOpenChange={setShowPayableForm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                Conta a Pagar
              </Dialog.Title>
              <Dialog.Close asChild><button className="btn-ghost p-2"><X size={18} /></button></Dialog.Close>
            </div>
            <form onSubmit={savePayable} className="p-5 space-y-4">
              <div>
                <label className="label">Descrição *</label>
                <input type="text" className="input-base" value={payableForm.description}
                  onChange={e => setPayableForm({ ...payableForm, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valor *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                    <input type="number" step="0.01" min="0" className="input-base pl-9" value={payableForm.amount}
                      onChange={e => setPayableForm({ ...payableForm, amount: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="label">Vencimento *</label>
                  <input type="date" className="input-base" value={payableForm.due_date}
                    onChange={e => setPayableForm({ ...payableForm, due_date: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fornecedor</label>
                  <select className="input-base" value={payableForm.supplier_id}
                    onChange={e => setPayableForm({ ...payableForm, supplier_id: e.target.value })}>
                    <option value="">Nenhum</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Categoria</label>
                  <select className="input-base" value={payableForm.category_id}
                    onChange={e => setPayableForm({ ...payableForm, category_id: e.target.value })}>
                    <option value="">Nenhuma</option>
                    {categories.filter(c => c.type === 'saida').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative shrink-0">
                  <input type="checkbox" className="sr-only" checked={payableForm.recurrent}
                    onChange={e => setPayableForm({ ...payableForm, recurrent: e.target.checked })} />
                  <div className={`w-10 h-5 rounded-full transition-colors ${payableForm.recurrent ? 'bg-brand-500' : 'bg-[rgb(var(--border-strong))]'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow m-0.5 transition-transform ${payableForm.recurrent ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>Conta recorrente</span>
              </label>
              {payableForm.recurrent && (
                <div>
                  <label className="label">Repetir a cada (meses)</label>
                  <input type="number" min="1" className="input-base" value={payableForm.recurrence_months}
                    onChange={e => setPayableForm({ ...payableForm, recurrence_months: e.target.value })} placeholder="Ex: 1 = mensal" />
                </div>
              )}
              <div>
                <label className="label">Observações</label>
                <textarea className="input-base resize-none" rows={2} value={payableForm.notes}
                  onChange={e => setPayableForm({ ...payableForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild><button type="button" className="btn-secondary flex-1 justify-center">Cancelar</button></Dialog.Close>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <><Loader2 size={15} className="animate-spin" />Salvando...</> : 'Registrar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal: Conta a Receber */}
      <Dialog.Root open={showReceivableForm} onOpenChange={setShowReceivableForm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                Conta a Receber
              </Dialog.Title>
              <Dialog.Close asChild><button className="btn-ghost p-2"><X size={18} /></button></Dialog.Close>
            </div>
            <form onSubmit={saveReceivable} className="p-5 space-y-4">
              <div>
                <label className="label">Descrição *</label>
                <input type="text" className="input-base" value={receivableForm.description}
                  onChange={e => setReceivableForm({ ...receivableForm, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valor *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                    <input type="number" step="0.01" min="0" className="input-base pl-9" value={receivableForm.amount}
                      onChange={e => setReceivableForm({ ...receivableForm, amount: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="label">Vencimento *</label>
                  <input type="date" className="input-base" value={receivableForm.due_date}
                    onChange={e => setReceivableForm({ ...receivableForm, due_date: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Plataforma</label>
                <select className="input-base" value={receivableForm.platform_id}
                  onChange={e => setReceivableForm({ ...receivableForm, platform_id: e.target.value })}>
                  <option value="">Nenhuma</option>
                  {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Observações</label>
                <textarea className="input-base resize-none" rows={2} value={receivableForm.notes}
                  onChange={e => setReceivableForm({ ...receivableForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild><button type="button" className="btn-secondary flex-1 justify-center">Cancelar</button></Dialog.Close>
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
