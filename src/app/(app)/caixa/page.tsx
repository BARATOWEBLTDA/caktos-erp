'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Edit2, Loader2, X, History, Wallet } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Platform } from '@/types'
import toast from 'react-hot-toast'

export default function CaixaPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState('')
  const [bankBalance, setBankBalance] = useState(0)
  const [bankHistory, setBankHistory] = useState<Array<{ balance: number; notes: string | null; recorded_at: string }>>([])
  const [platforms, setPlatforms] = useState<(Platform & { latest_balance?: number; balance_updated_at?: string })[]>([])
  const [saving, setSaving] = useState(false)

  // Modal saldo banco
  const [showBankModal, setShowBankModal] = useState(false)
  const [bankForm, setBankForm] = useState({ balance: '', notes: '' })

  // Modal saldo plataforma
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [platformForm, setPlatformForm] = useState({ balance: '', notes: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user!.id).single()
    const sid = profile!.store_id
    setStoreId(sid)

    const [bankRes, bankHistRes, platRes] = await Promise.all([
      supabase.from('bank_balance_history').select('balance, notes, recorded_at').eq('store_id', sid).order('recorded_at', { ascending: false }).limit(1).single(),
      supabase.from('bank_balance_history').select('balance, notes, recorded_at').eq('store_id', sid).order('recorded_at', { ascending: false }).limit(10),
      supabase.from('platforms').select('*').eq('store_id', sid).eq('is_active', true),
    ])

    setBankBalance(bankRes.data?.balance ?? 0)
    setBankHistory(bankHistRes.data ?? [])
    setPlatforms(platRes.data ?? [])
    setLoading(false)
  }

  async function saveBankBalance(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('bank_balance_history').insert({
        store_id: storeId,
        balance: parseFloat(bankForm.balance) || 0,
        notes: bankForm.notes || null,
      })
      if (error) throw error
      toast.success('Saldo bancário atualizado!')
      setShowBankModal(false)
      load()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  async function savePlatformBalance(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlatform) return
    setSaving(true)
    try {
      // Inserir histórico
      await supabase.from('platform_balances').insert({
        store_id: storeId,
        platform_id: selectedPlatform.id,
        balance: parseFloat(platformForm.balance) || 0,
        notes: platformForm.notes || null,
      })
      // Atualizar saldo na plataforma
      const { error } = await supabase.from('platforms').update({
        balance: parseFloat(platformForm.balance) || 0,
        balance_updated_at: new Date().toISOString(),
      }).eq('id', selectedPlatform.id)
      if (error) throw error
      toast.success(`Saldo da ${selectedPlatform.name} atualizado!`)
      setShowPlatformModal(false)
      load()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  const totalPlatforms = platforms.reduce((s, p) => s + Number(p.balance ?? 0), 0)
  const totalGeral = bankBalance + totalPlatforms

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="section-title text-xl">Caixa</h1>
        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
          Saldos inseridos manualmente
        </p>
      </div>

      {/* Total geral destaque */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ background: 'linear-gradient(135deg, #c44df0, #f43f5e)' }} />
        <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--text-muted))' }}>
          Total disponível (banco + plataformas)
        </p>
        <p className="text-4xl font-bold gradient-text" style={{ fontFamily: 'Sora, sans-serif' }}>
          {loading ? '—' : formatCurrency(totalGeral)}
        </p>
      </div>

      {/* Banco */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <Building2 size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Conta Bancária</h3>
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Inserção manual</p>
            </div>
          </div>
          <button onClick={() => { setBankForm({ balance: bankBalance.toString(), notes: '' }); setShowBankModal(true) }}
            className="btn-secondary px-3 py-2 text-xs gap-1.5">
            <Edit2 size={13} /> Atualizar
          </button>
        </div>

        <p className="text-3xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#3b82f6' }}>
          {loading ? '—' : formatCurrency(bankBalance)}
        </p>

        {bankHistory.length > 1 && (
          <div>
            <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'rgb(var(--text-muted))' }}>
              <History size={12} /> Histórico recente
            </p>
            <div className="space-y-1.5">
              {bankHistory.slice(1, 5).map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  <span>{formatDateTime(h.recorded_at)}{h.notes ? ` · ${h.notes}` : ''}</span>
                  <span className="font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>{formatCurrency(h.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plataformas */}
      <div className="space-y-3">
        <h2 className="section-title">Saldos nas Plataformas</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}</div>
        ) : (
          platforms.map(platform => (
            <div key={platform.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${platform.color}20` }}>
                    <div className="w-4 h-4 rounded-full" style={{ background: platform.color }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                      {platform.name}
                    </h3>
                    {platform.balance_updated_at && (
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                        Atualizado em {formatDateTime(platform.balance_updated_at)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: platform.color }}>
                    {formatCurrency(Number(platform.balance ?? 0))}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedPlatform(platform)
                      setPlatformForm({ balance: (platform.balance ?? 0).toString(), notes: '' })
                      setShowPlatformModal(true)
                    }}
                    className="btn-secondary px-3 py-2 text-xs gap-1.5">
                    <Edit2 size={13} /> Atualizar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Atualizar saldo banco */}
      <Dialog.Root open={showBankModal} onOpenChange={setShowBankModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                Atualizar Saldo Bancário
              </Dialog.Title>
              <Dialog.Close asChild><button className="btn-ghost p-2"><X size={18} /></button></Dialog.Close>
            </div>
            <form onSubmit={saveBankBalance} className="p-5 space-y-4">
              <div>
                <label className="label">Saldo atual (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                  <input type="number" step="0.01" className="input-base pl-9" value={bankForm.balance}
                    onChange={e => setBankForm({ ...bankForm, balance: e.target.value })} required autoFocus />
                </div>
              </div>
              <div>
                <label className="label">Observação</label>
                <input type="text" className="input-base" value={bankForm.notes}
                  onChange={e => setBankForm({ ...bankForm, notes: e.target.value })} placeholder="Ex: Extrato do dia" />
              </div>
              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild><button type="button" className="btn-secondary flex-1 justify-center">Cancelar</button></Dialog.Close>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <><Loader2 size={15} className="animate-spin" />Salvando...</> : 'Salvar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal: Atualizar saldo plataforma */}
      <Dialog.Root open={showPlatformModal} onOpenChange={setShowPlatformModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                Saldo — {selectedPlatform?.name}
              </Dialog.Title>
              <Dialog.Close asChild><button className="btn-ghost p-2"><X size={18} /></button></Dialog.Close>
            </div>
            <form onSubmit={savePlatformBalance} className="p-5 space-y-4">
              <div>
                <label className="label">Saldo atual (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                  <input type="number" step="0.01" className="input-base pl-9" value={platformForm.balance}
                    onChange={e => setPlatformForm({ ...platformForm, balance: e.target.value })} required autoFocus />
                </div>
              </div>
              <div>
                <label className="label">Observação</label>
                <input type="text" className="input-base" value={platformForm.notes}
                  onChange={e => setPlatformForm({ ...platformForm, notes: e.target.value })}
                  placeholder={`Ex: Saldo ${selectedPlatform?.name} verificado`} />
              </div>
              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild><button type="button" className="btn-secondary flex-1 justify-center">Cancelar</button></Dialog.Close>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <><Loader2 size={15} className="animate-spin" />Salvando...</> : 'Salvar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
