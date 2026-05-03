'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Upload, Loader2, Tag, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { slugify } from '@/lib/utils'
import type { Category } from '@/types'
import toast from 'react-hot-toast'

export default function CategoriasPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ name: '', color: '#C084FC' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user!.id).single()
    setStoreId(profile!.store_id)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', profile!.store_id)
      .order('sort_order')
    setCategories(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', color: '#C084FC' })
    setImageFile(null)
    setImagePreview(null)
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, color: cat.color })
    setImagePreview(cat.image_url)
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
      let imageUrl = editing?.image_url ?? null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${storeId}/${slugify(form.name)}-${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('categories').upload(path, imageFile, { upsert: true })
        if (error) throw error
        imageUrl = supabase.storage.from('categories').getPublicUrl(path).data.publicUrl
      }
      const payload = {
        store_id: storeId,
        name: form.name,
        slug: slugify(form.name),
        color: form.color,
        image_url: imageUrl,
      }
      if (editing) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Categoria atualizada!')
      } else {
        const { error } = await supabase.from('categories').insert({ ...payload, sort_order: categories.length + 1 })
        if (error) throw error
        toast.success('Categoria criada!')
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
    if (!confirm('Remover esta categoria? Os produtos vinculados não serão deletados.')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Categoria removida')
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const COLORS = ['#F9A8D4','#EC4899','#A855F7','#C084FC','#FB7185','#F43F5E','#FCD34D','#D97706','#FEF08A','#86EFAC','#22C55E','#3B82F6','#000000','#1E1B4B']

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-xl">Categorias</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {categories.length} categorias cadastradas
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-32 rounded-2xl shimmer" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20">
          <Tag size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Nenhuma categoria ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {categories.map(cat => (
            <div key={cat.id} className="card p-4 flex flex-col items-center gap-3 group relative">
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ background: `${cat.color}20` }}>
                {cat.image_url
                  ? <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  : <Tag size={28} style={{ color: cat.color }} />
                }
              </div>
              <p className="text-sm font-semibold text-center" style={{ color: 'rgb(var(--text-primary))' }}>
                {cat.name}
              </p>
              <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />

              {/* Actions */}
              <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                <button onClick={() => openEdit(cat)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <Edit2 size={13} style={{ color: 'rgb(var(--text-secondary))' }} />
                </button>
                <button onClick={() => handleDelete(cat.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10">
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
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold"
                style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                {editing ? 'Editar Categoria' : 'Nova Categoria'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn-ghost p-2"><X size={18} /></button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Imagem */}
              <div>
                <label className="label">Imagem</label>
                <div onClick={() => fileRef.current?.click()}
                  className="w-full h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
                  style={{ borderColor: 'rgb(var(--border-strong))', background: 'rgb(var(--bg-tertiary))' }}>
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="w-full h-full object-contain rounded-2xl p-2" />
                    : <><Upload size={20} className="mb-1" style={{ color: 'rgb(var(--text-muted))' }} />
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Upload de imagem</p></>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </div>

              {/* Nome */}
              <div>
                <label className="label">Nome *</label>
                <input type="text" className="input-base" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>

              {/* Cor */}
              <div>
                <label className="label">Cor de identificação</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        background: c,
                        outline: form.color === c ? `3px solid ${c}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
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
