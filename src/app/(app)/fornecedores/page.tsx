'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Upload, Loader2, Truck, Phone, Mail, Globe, X, Search } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { slugify, supplierTypeLabel } from '@/lib/utils'
import type { Supplier } from '@/types'
import toast from 'react-hot-toast'

export default function FornecedoresPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '', type: 'makeup' as Supplier['type'],
    phone: '', email: '', website: '', payment_term_days: '30', notes: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user!.id).single()
    setStoreId(profile!.store_id)
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', profile!.store_id)
      .eq('is_active', true)
      .order('name')
    setSuppliers(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', type: 'makeup', phone: '', email: '', website: '', payment_term_days: '30', notes: '' })
    setImageFile(null)
    setImagePreview(null)
    setShowForm(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({
      name: s.name, type: s.type,
      phone: s.phone ?? '', email: s.email ?? '', website: s.website ?? '',
      payment_term_days: s.payment_term_days?.toString() ?? '30', notes: s.notes ?? '',
    })
    setImagePreview(s.photo_url)
    setImageFile(null)
    setShowForm(true)
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let photoUrl = editing?.photo_url ?? null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${storeId}/${slugify(form.name)}-${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('suppliers').upload(path, imageFile, { upsert: true })
        if (error) throw error
        photoUrl = supabase.storage.from('suppliers').getPublicUrl(path).data.publicUrl
      }
      const payload = {
        store_id: storeId,
        name: form.name,
        type: form.type,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        photo_url: photoUrl,
        payment_term_days: parseInt(form.payment_term_days) || 30,
        notes: form.notes || null,
      }
      if (editing) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Fornecedor atualizado!')
      } else {
        const { error } = await supabase.from('suppliers').insert(payload)
        if (error) throw error
        toast.success('Fornecedor cadastrado!')
      }
      setShowForm(false)
      load()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Desativar este fornecedor?')) return
    await supabase.from('suppliers').update({ is_active: false }).eq('id', id)
    toast.success('Fornecedor desativado')
    setSuppliers(prev => prev.filter(s => s.id !== id))
  }

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-xl">Fornecedores</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {suppliers.length} fornecedores ativos
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Novo fornecedor
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
        <input type="text" placeholder="Buscar fornecedor..." className="input-base pl-9"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 rounded-2xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Truck size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Nenhum fornecedor encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="card p-5 group relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
                  style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">🏭</div>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'rgb(var(--text-primary))' }}>
                    {s.name}
                  </p>
                  <span className="badge text-xs px-2 py-0.5 mt-0.5"
                    style={{ background: 'rgb(var(--bg-tertiary))', color: 'rgb(var(--text-muted))' }}>
                    {supplierTypeLabel[s.type]}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                    <Phone size={12} />{s.phone}
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                    <Mail size={12} /><span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.website && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                    <Globe size={12} /><span className="truncate">{s.website}</span>
                  </div>
                )}
                <div className="text-xs pt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                  Prazo pagamento: <strong style={{ color: 'rgb(var(--text-secondary))' }}>{s.payment_term_days} dias</strong>
                </div>
              </div>

              <div className="absolute top-3 right-3 hidden group-hover:flex gap-1">
                <button onClick={() => openEdit(s)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <Edit2 size={13} style={{ color: 'rgb(var(--text-secondary))' }} />
                </button>
                <button onClick={() => handleDelete(s.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10">
                  <Trash2 size={13} style={{ color: '#ef4444' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog.Root open={showForm} onOpenChange={setShowForm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold"
                style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                {editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn-ghost p-2"><X size={18} /></button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Foto */}
              <div>
                <label className="label">Foto</label>
                <div onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer mx-auto"
                  style={{ borderColor: 'rgb(var(--border-strong))', background: 'rgb(var(--bg-tertiary))' }}>
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-2xl" />
                    : <Upload size={20} style={{ color: 'rgb(var(--text-muted))' }} />
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nome *</label>
                  <input type="text" className="input-base" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="input-base" value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as Supplier['type'] })}>
                    <option value="makeup">Maquiagem</option>
                    <option value="insumo">Insumo</option>
                    <option value="embalagem">Embalagem</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="label">Prazo de pagamento (dias)</label>
                  <input type="number" min="0" className="input-base" value={form.payment_term_days}
                    onChange={e => setForm({ ...form, payment_term_days: e.target.value })} />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input type="tel" className="input-base" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input type="email" className="input-base" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Site</label>
                  <input type="url" className="input-base" value={form.website}
                    onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://" />
                </div>
                <div className="col-span-2">
                  <label className="label">Observações</label>
                  <textarea className="input-base resize-none" rows={3} value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="btn-secondary flex-1 justify-center">Cancelar</button>
                </Dialog.Close>
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
