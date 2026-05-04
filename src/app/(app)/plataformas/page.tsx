'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Edit2, Store, Percent, DollarSign, Loader2, X, Plus, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { Platform, PlatformOptionalFee } from '@/types'
import toast from 'react-hot-toast'

export default function PlataformasPage() {
  const supabase = createClient()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Platform | null>(null)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState('')

  const [form, setForm] = useState({
    name: '', color: '#C084FC',
    base_commission: '', fixed_fee: '',
    has_optional_fees: false,
    has_variable_shipping: false,
    has_category_commission: false,
  })
  const [optionalFees, setOptionalFees] = useState<PlatformOptionalFee[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user!.id).single()
    setStoreId(profile!.store_id)
    const { data } = await supabase.from('platforms').select('*').eq('store_id', profile!.store_id).order('name')
    setPlatforms(data ?? [])
    setLoading(false)
  }

  function openEdit(p: Platform) {
    setEditing(p)
    setForm({
      name: p.name,
      color: p.color,
      base_commission: p.base_commission.toString(),
      fixed_fee: p.fixed_fee.toString(),
      has_optional_fees: p.has_optional_fees,
      has_variable_shipping: p.has_variable_shipping,
      has_category_commission: p.has_category_commission,
    })
    setOptionalFees(p.optional_fees ?? [])
    setShowForm(true)
  }

  function addOptionalFee() {
    setOptionalFees(prev => [
      ...prev,
      { id: `fee_${Date.now()}`, name: '', rate: 0, active: false },
    ])
  }

  function removeOptionalFee(id: string) {
    setOptionalFees(prev => prev.filter(f => f.id !== id))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        color: form.color,
        base_commission: parseFloat(form.base_commission) || 0,
        fixed_fee: parseFloat(form.fixed_fee) || 0,
        has_optional_fees: form.has_optional_fees,
        has_variable_shipping: form.has_variable_shipping,
        has_category_commission: form.has_category_commission,
        optional_fees: form.has_optional_fees ? optionalFees : [],
      }
      const { error } = await supabase.from('platforms').update(payload).eq('id', editing.id)
      if (error) throw error
      toast.success('Plataforma atualizada!')
      setShowForm(false)
      load()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const COLORS = ['#F97316','#000000','#FFE600','#22C55E','#3B82F6','#EC4899','#A855F7','#EF4444']

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="section-title text-xl">Plataformas de Venda</h1>
        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
          Configure comissões, taxas opcionais e frete por plataforma
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-36 rounded-2xl shimmer" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {platforms.map(p => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Logo da plataforma */}
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1.5"
                    style={{ background: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
                    {p.slug === 'shopee' && (
                      <img src="https://cdn.awsli.com.br/2500x2500/2015/2015798/produto/354645871/shoppe--2--mvj1hgvttt.png" alt="Shopee" className="w-full h-full object-contain" />
                    )}
                    {p.slug === 'mercadolivre' && (
                      <img src="https://s2.glbimg.com/Bu6upvmSg6SRv0za635uXphThKo=/620x430/e.glbimg.com/og/ed/f/original/2020/03/28/mercado-livre.jpg" alt="Mercado Livre" className="w-full h-full object-contain" />
                    )}
                    {p.slug === 'tiktok' && (
                      <img src="https://static.vecteezy.com/system/resources/thumbnails/066/712/310/small_2x/tiktok-shop-icon-logo-symbol-free-png.png" alt="TikTok Shop" className="w-full h-full object-contain" />
                    )}
                    {!['shopee','tiktok','mercadolivre'].includes(p.slug) && (
                      <div className="w-4 h-4 rounded-full" style={{ background: p.color }} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                      {p.name}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                      Slug: {p.slug}
                    </p>
                  </div>
                </div>
                <button onClick={() => openEdit(p)} className="btn-secondary px-3 py-2 text-xs gap-1.5">
                  <Edit2 size={13} /> Editar
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl p-3" style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Comissão base</p>
                  <p className="text-lg font-bold" style={{ color: '#c44df0', fontFamily: 'Sora, sans-serif' }}>
                    {formatPercent(p.base_commission)}
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Taxa fixa</p>
                  <p className="text-lg font-bold" style={{ color: 'rgb(var(--text-primary))', fontFamily: 'Sora, sans-serif' }}>
                    {formatCurrency(p.fixed_fee)}
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Taxas opcionais</p>
                  <p className="text-sm font-semibold" style={{ color: p.has_optional_fees ? '#10b981' : 'rgb(var(--text-muted))' }}>
                    {p.has_optional_fees ? `${p.optional_fees?.length ?? 0} configuradas` : 'Não'}
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Frete variável</p>
                  <p className="text-sm font-semibold" style={{ color: p.has_variable_shipping ? '#10b981' : 'rgb(var(--text-muted))' }}>
                    {p.has_variable_shipping ? 'Sim' : 'Não'}
                  </p>
                </div>
              </div>

              {/* Taxas opcionais detalhe */}
              {p.has_optional_fees && (p.optional_fees?.length ?? 0) > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {p.optional_fees?.map(fee => (
                    <span key={fee.id} className="badge text-xs px-2.5 py-1"
                      style={{ background: 'rgba(196,77,240,0.1)', color: '#c44df0' }}>
                      {fee.name}: +{fee.rate}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal editar plataforma */}
      <Dialog.Root open={showForm} onOpenChange={setShowForm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold"
                style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                Editar {editing?.name}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn-ghost p-2"><X size={18} /></button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Comissão base (%)</label>
                  <input type="number" step="0.1" min="0" max="100" className="input-base"
                    value={form.base_commission}
                    onChange={e => setForm({ ...form, base_commission: e.target.value })} />
                </div>
                <div>
                  <label className="label">Taxa fixa (R$)</label>
                  <input type="number" step="0.01" min="0" className="input-base"
                    value={form.fixed_fee}
                    onChange={e => setForm({ ...form, fixed_fee: e.target.value })} />
                </div>
              </div>

              {/* Cor */}
              <div>
                <label className="label">Cor da plataforma</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{
                        background: c,
                        borderColor: form.color === c ? 'white' : 'transparent',
                        outline: form.color === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                      }} />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                {[
                  { key: 'has_optional_fees', label: 'Possui taxas opcionais (ex: Acelera, Campanha)' },
                  { key: 'has_variable_shipping', label: 'Frete inserido manualmente por venda' },
                  { key: 'has_category_commission', label: 'Comissão varia por categoria de produto' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <div className="relative shrink-0">
                      <input type="checkbox" className="sr-only"
                        checked={form[key as keyof typeof form] as boolean}
                        onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                      <div className={`w-10 h-5 rounded-full transition-colors ${
                        form[key as keyof typeof form] ? 'bg-brand-500' : 'bg-[rgb(var(--border-strong))]'
                      }`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow m-0.5 transition-transform ${
                          form[key as keyof typeof form] ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                    <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{label}</span>
                  </label>
                ))}
              </div>

              {/* Taxas opcionais */}
              {form.has_optional_fees && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Taxas opcionais</label>
                    <button type="button" onClick={addOptionalFee}
                      className="btn-ghost text-xs gap-1 px-2 py-1">
                      <Plus size={13} /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {optionalFees.map((fee, i) => (
                      <div key={fee.id} className="flex gap-2 items-center">
                        <input type="text" placeholder="Nome (ex: Acelera Dinheiro)" className="input-base flex-1 py-2 text-sm"
                          value={fee.name}
                          onChange={e => setOptionalFees(prev => prev.map((f, idx) => idx === i ? { ...f, name: e.target.value } : f))} />
                        <div className="relative w-24 shrink-0">
                          <input type="number" step="0.1" min="0" placeholder="%" className="input-base py-2 text-sm pr-6"
                            value={fee.rate}
                            onChange={e => setOptionalFees(prev => prev.map((f, idx) => idx === i ? { ...f, rate: parseFloat(e.target.value) || 0 } : f))} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>%</span>
                        </div>
                        <button type="button" onClick={() => removeOptionalFee(fee.id)}
                          className="p-2 hover:text-red-500 transition-colors" style={{ color: 'rgb(var(--text-muted))' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="btn-secondary flex-1 justify-center">Cancelar</button>
                </Dialog.Close>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <><Loader2 size={15} className="animate-spin" />Salvando...</> : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}