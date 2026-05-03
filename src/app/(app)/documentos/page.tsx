'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FolderOpen, FileText, Download, Trash2, Search, Loader2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { formatDate, formatFileSize, documentTypeLabel } from '@/lib/utils'
import type { Document, DocumentType } from '@/types'
import toast from 'react-hot-toast'

const TYPE_COLORS: Record<string, string> = {
  nota_fiscal: '#10b981',
  comprovante: '#3b82f6',
  contrato: '#c44df0',
  outro: '#6b7280',
}

const TYPE_ICONS: Record<string, string> = {
  nota_fiscal: '🧾',
  comprovante: '📄',
  contrato: '📋',
  outro: '📁',
}

export default function DocumentosPage() {
  const supabase = createClient()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('todos')
  const [showUpload, setShowUpload] = useState(false)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'outro' as DocumentType,
    description: '',
    tags: '',
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user!.id).single()
    setStoreId(profile!.store_id)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('store_id', profile!.store_id)
      .order('created_at', { ascending: false })
    setDocuments(data ?? [])
    setLoading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) {
      setFile(f)
      setUploadForm(prev => ({ ...prev, name: prev.name || f.name.replace(/\.[^.]+$/, '') }))
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setUploadForm(prev => ({ ...prev, name: prev.name || f.name.replace(/\.[^.]+$/, '') }))
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return toast.error('Selecione um arquivo')
    setSaving(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${storeId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) throw uploadError

      const fileUrl = supabase.storage.from('documents').getPublicUrl(path).data.publicUrl

      const { error } = await supabase.from('documents').insert({
        store_id: storeId,
        name: uploadForm.name || file.name,
        type: uploadForm.type,
        file_url: fileUrl,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        description: uploadForm.description || null,
        tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      })
      if (error) throw error
      toast.success('Documento enviado!')
      setShowUpload(false)
      setFile(null)
      setUploadForm({ name: '', type: 'outro', description: '', tags: '' })
      load()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  async function handleDelete(doc: Document) {
    if (!confirm('Excluir este documento permanentemente?')) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    toast.success('Documento excluído')
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  const filtered = documents.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase()) ||
      d.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchType = typeFilter === 'todos' || d.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-xl">Drive Interno</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {documents.length} documentos armazenados
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Upload size={16} /> Enviar documento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
          <input type="text" placeholder="Buscar documentos..." className="input-base pl-9"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['todos', 'nota_fiscal', 'comprovante', 'contrato', 'outro'].map(type => (
            <button key={type} onClick={() => setTypeFilter(type)}
              className={`badge px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                typeFilter === type ? 'bg-brand-500 text-white' : 'bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))]'
              }`}>
              {type === 'todos' ? 'Todos' : documentTypeLabel[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de documentos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 rounded-2xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
            {search ? 'Nenhum documento encontrado' : 'Nenhum documento enviado ainda'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(doc => (
            <div key={doc.id} className="card p-4 group relative">
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">{TYPE_ICONS[doc.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'rgb(var(--text-primary))' }}>
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="badge text-xs px-1.5 py-0.5" style={{ background: `${TYPE_COLORS[doc.type]}15`, color: TYPE_COLORS[doc.type] }}>
                      {documentTypeLabel[doc.type]}
                    </span>
                    {doc.file_size && (
                      <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                        {formatFileSize(doc.file_size)}
                      </span>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'rgb(var(--text-muted))' }}>
                      {doc.description}
                    </p>
                  )}
                  {doc.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {doc.tags.map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded-md"
                          style={{ background: 'rgb(var(--bg-tertiary))', color: 'rgb(var(--text-muted))' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs mt-2" style={{ color: 'rgb(var(--text-muted))' }}>
                    {formatDate(doc.created_at)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="absolute top-3 right-3 hidden group-hover:flex gap-1">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgb(var(--bg-tertiary))' }}>
                  <Download size={13} style={{ color: 'rgb(var(--text-secondary))' }} />
                </a>
                <button onClick={() => handleDelete(doc)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors">
                  <Trash2 size={13} style={{ color: '#ef4444' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Upload */}
      <Dialog.Root open={showUpload} onOpenChange={setShowUpload}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl animate-scale-in"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <Dialog.Title className="text-base font-bold"
                style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
                Enviar Documento
              </Dialog.Title>
              <Dialog.Close asChild><button className="btn-ghost p-2"><X size={18} /></button></Dialog.Close>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all"
                style={{
                  borderColor: isDragging ? '#c44df0' : 'rgb(var(--border-strong))',
                  background: isDragging ? 'rgba(196, 77, 240, 0.05)' : 'rgb(var(--bg-tertiary))',
                }}>
                {file ? (
                  <div className="text-center px-4">
                    <p className="text-2xl mb-1">{TYPE_ICONS[uploadForm.type]}</p>
                    <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>{file.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{formatFileSize(file.size)}</p>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                      Arraste ou clique para selecionar
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                      PDF, imagens, documentos
                    </p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileInput} />

              <div>
                <label className="label">Nome do documento</label>
                <input type="text" className="input-base" value={uploadForm.name}
                  onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="Ex: NF Fornecedor Março" />
              </div>

              <div>
                <label className="label">Tipo</label>
                <select className="input-base" value={uploadForm.type}
                  onChange={e => setUploadForm({ ...uploadForm, type: e.target.value as DocumentType })}>
                  <option value="nota_fiscal">Nota Fiscal</option>
                  <option value="comprovante">Comprovante</option>
                  <option value="contrato">Contrato</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea className="input-base resize-none" rows={2} value={uploadForm.description}
                  onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} />
              </div>

              <div>
                <label className="label">Tags</label>
                <input type="text" className="input-base" value={uploadForm.tags}
                  onChange={e => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="fornecedor, março, 2025 (separar por vírgula)" />
              </div>

              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="btn-secondary flex-1 justify-center">Cancelar</button>
                </Dialog.Close>
                <button type="submit" disabled={saving || !file} className="btn-primary flex-1 justify-center">
                  {saving ? <><Loader2 size={15} className="animate-spin" />Enviando...</> : 'Enviar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
