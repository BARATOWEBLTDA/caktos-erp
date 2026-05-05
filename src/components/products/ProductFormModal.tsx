'use client'

import { useState, useRef, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Upload, Loader2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Product, Category, Platform } from '@/types'
import toast from 'react-hot-toast'

interface Variation {
  id?: string
  name: string
  sku: string
  prices: Record<string, string> // platform_id -> sale_price
  isNew?: boolean
}

interface ProductFormModalProps {
  product: (Product & { stock_quantity?: number }) | null
  categories: Category[]
  platforms: Platform[]
  suppliers: Array<{ id: string; name: string }>
  storeId: string
  onClose: () => void
  onSave: () => void
}

export default function ProductFormModal({
  product,
  categories,
  platforms,
  suppliers,
  storeId,
  onClose,
  onSave,
}: ProductFormModalProps) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'plataformas' | 'variacoes'>('info')

  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    purchase_price: product?.purchase_price?.toString() ?? '',
    sale_price: product?.sale_price?.toString() ?? '',
    category_id: product?.category_id ?? '',
    supplier_id: product?.supplier_id ?? '',
    min_stock: product?.min_stock?.toString() ?? '5',
    tags: product?.tags?.join(', ') ?? '',
  })

  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, {
    active: boolean
    custom_commission: string
    sale_price: string
  }>>(
    Object.fromEntries(
      platforms.map(p => {
        const pp = product?.platforms?.find((pp: { platform_id: string; is_active: boolean; custom_commission: number | null; sale_price: number | null }) => pp.platform_id === p.id)
        return [p.id, {
          active: pp?.is_active ?? false,
          custom_commission: pp?.custom_commission?.toString() ?? '',
          sale_price: pp?.sale_price?.toString() ?? '',
        }]
      })
    )
  )

  const [variations, setVariations] = useState<Variation[]>([])
  const [loadingVariations, setLoadingVariations] = useState(false)

  useEffect(() => {
    if (product?.id) {
      loadVariations()
    }
  }, [product?.id])

  async function loadVariations() {
    setLoadingVariations(true)
    const { data: vars } = await supabase
      .from('product_variations')
      .select('id, name, sku, variation_platform_prices(platform_id, sale_price)')
      .eq('product_id', product!.id)
      .eq('is_active', true)

    if (vars) {
      setVariations(vars.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku ?? '',
        prices: Object.fromEntries(
          (v.variation_platform_prices as { platform_id: string; sale_price: number }[])
            .map(vp => [vp.platform_id, vp.sale_price.toString()])
        ),
      })))
    }
    setLoadingVariations(false)
  }

  function addVariation() {
    setVariations(prev => [...prev, {
      name: '',
      sku: '',
      prices: Object.fromEntries(platforms.map(p => [p.id, ''])),
      isNew: true,
    }])
  }

  function removeVariation(index: number) {
    setVariations(prev => prev.filter((_, i) => i !== index))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let imageUrl = product?.image_url ?? null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${storeId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(path, imageFile, { upsert: true })
        if (uploadError) throw uploadError
        imageUrl = supabase.storage.from('products').getPublicUrl(path).data.publicUrl
      }

      // Usar menor preço de venda das plataformas ativas como sale_price do produto
      const activePrices = Object.values(selectedPlatforms)
        .filter(p => p.active && p.sale_price)
        .map(p => parseFloat(p.sale_price))
      const minSalePrice = activePrices.length > 0 ? Math.min(...activePrices) : parseFloat(form.sale_price) || 0

      const productData = {
        store_id: storeId,
        name: form.name,
        sku: form.sku || null,
        description: form.description || null,
        image_url: imageUrl,
        purchase_price: parseFloat(form.purchase_price) || 0,
        sale_price: minSalePrice,
        category_id: form.category_id || null,
        supplier_id: form.supplier_id || null,
        min_stock: parseInt(form.min_stock) || 5,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }

      let productId = product?.id

      if (product) {
        const { error } = await supabase.from('products').update(productData).eq('id', product.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('products').insert(productData).select().single()
        if (error) throw error
        productId = data.id
      }

      // Salvar plataformas — upsert
      for (const [platformId, config] of Object.entries(selectedPlatforms)) {
        const { error } = await supabase
          .from('product_platforms')
          .upsert({
            product_id: productId,
            platform_id: platformId,
            is_active: config.active,
            custom_commission: config.custom_commission ? parseFloat(config.custom_commission) : null,
            sale_price: config.sale_price ? parseFloat(config.sale_price) : null,
            active_optional_fees: [],
          }, { onConflict: 'product_id,platform_id' })
        if (error) throw error
      }

      // Salvar variações
      for (const variation of variations) {
        let variationId = variation.id

        if (variation.id) {
          await supabase.from('product_variations').update({
            name: variation.name,
            sku: variation.sku || null,
          }).eq('id', variation.id)
        } else if (variation.name) {
          const { data: newVar, error } = await supabase.from('product_variations').insert({
            product_id: productId,
            name: variation.name,
            sku: variation.sku || null,
          }).select().single()
          if (error) throw error
          variationId = newVar.id
        }

        if (variationId) {
          for (const [platformId, price] of Object.entries(variation.prices)) {
            if (price) {
              await supabase.from('variation_platform_prices').upsert({
                variation_id: variationId,
                platform_id: platformId,
                sale_price: parseFloat(price),
                is_active: true,
              }, { onConflict: 'variation_id,platform_id' })
            }
          }
        }
      }

      toast.success(product ? 'Produto atualizado!' : 'Produto cadastrado!')
      onSave()
      onClose()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'info', label: 'Informações' },
    { key: 'plataformas', label: 'Plataformas' },
    { key: 'variacoes', label: `Variações${variations.length > 0 ? ` (${variations.length})` : ''}` },
  ] as const

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl animate-scale-in"
          style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--border))', boxShadow: 'var(--shadow-modal)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
            <Dialog.Title className="text-base font-bold"
              style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
              {product ? 'Editar Produto' : 'Novo Produto'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="btn-ghost p-2"><X size={18} /></button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-3 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
            {tabs.map(tab => (
              <button key={tab.key} type="button"
                onClick={() => setActiveTab(tab.key)}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
                style={{
                  background: activeTab === tab.key ? 'rgba(196,77,240,0.1)' : 'transparent',
                  color: activeTab === tab.key ? '#c44df0' : 'rgb(var(--text-muted))',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* ABA: INFORMAÇÕES */}
            {activeTab === 'info' && (
              <>
                {/* Imagem */}
                <div>
                  <label className="label">Imagem do produto</label>
                  <div onClick={() => fileRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
                    style={{ borderColor: 'rgb(var(--border-strong))', background: 'rgb(var(--bg-tertiary))' }}>
                    {imagePreview
                      ? <img src={imagePreview} alt="preview" className="w-full h-full object-contain rounded-2xl p-2" />
                      : <><Upload size={22} className="mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
                        <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Clique para fazer upload</p>
                        <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>PNG, JPG, WEBP até 5MB</p></>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </div>

                {/* Nome e SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Nome *</label>
                    <input type="text" className="input-base" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">SKU</label>
                    <input type="text" className="input-base" value={form.sku}
                      onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Ex: BAT-001" />
                  </div>
                </div>

                {/* Preço de compra + estoque mínimo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Preço de compra *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                      <input type="number" step="0.01" min="0" className="input-base pl-9" value={form.purchase_price}
                        onChange={e => setForm({ ...form, purchase_price: e.target.value })} required />
                    </div>
                  </div>
                  <div>
                    <label className="label">Estoque mínimo</label>
                    <input type="number" min="0" className="input-base" value={form.min_stock}
                      onChange={e => setForm({ ...form, min_stock: e.target.value })} />
                  </div>
                </div>

                <p className="text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(196,77,240,0.08)', color: '#c44df0' }}>
                  💡 O preço de venda é definido por plataforma na aba <strong>Plataformas</strong>.
                </p>

                {/* Categoria, Fornecedor e Tags */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Categoria</label>
                    <select className="input-base" value={form.category_id}
                      onChange={e => setForm({ ...form, category_id: e.target.value })}>
                      <option value="">Selecionar...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Fornecedor</label>
                    <select className="input-base" value={form.supplier_id}
                      onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
                      <option value="">Selecionar...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Tags</label>
                  <input type="text" className="input-base" value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="nude, matte (separar por vírgula)" />
                </div>
              </>
            )}

            {/* ABA: PLATAFORMAS */}
            {activeTab === 'plataformas' && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  Configure o preço de venda e comissão para cada plataforma.
                </p>
                {platforms.map(platform => (
                  <div key={platform.id} className="rounded-2xl p-4"
                    style={{
                      background: 'rgb(var(--bg-tertiary))',
                      border: selectedPlatforms[platform.id]?.active ? `1px solid ${platform.color}40` : '1px solid transparent',
                    }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full" style={{ background: platform.color }} />
                        <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{platform.name}</span>
                        <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                          {platform.base_commission}% + R${platform.fixed_fee}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only"
                          checked={selectedPlatforms[platform.id]?.active ?? false}
                          onChange={e => setSelectedPlatforms(prev => ({
                            ...prev,
                            [platform.id]: { ...prev[platform.id], active: e.target.checked }
                          }))} />
                        <div className={`w-10 h-5 rounded-full transition-colors ${selectedPlatforms[platform.id]?.active ? 'bg-brand-500' : 'bg-[rgb(var(--border-strong))]'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white shadow m-0.5 transition-transform ${selectedPlatforms[platform.id]?.active ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </label>
                    </div>

                    {selectedPlatforms[platform.id]?.active && (
                      <div className="grid grid-cols-2 gap-3">
                        {platform.has_category_commission && (
                          <div>
                            <label className="text-xs mb-1 block" style={{ color: 'rgb(var(--text-muted))' }}>
                              Comissão nesta categoria (%)
                            </label>
                            <input type="number" step="0.1" min="0" max="100" className="input-base py-2 text-sm"
                              placeholder={`Padrão: ${platform.base_commission}%`}
                              value={selectedPlatforms[platform.id]?.custom_commission ?? ''}
                              onChange={e => setSelectedPlatforms(prev => ({
                                ...prev,
                                [platform.id]: { ...prev[platform.id], custom_commission: e.target.value }
                              }))} />
                          </div>
                        )}
                        <div className={platform.has_category_commission ? '' : 'col-span-2'}>
                          <label className="text-xs mb-1 block font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                            Preço de venda nesta plataforma *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                            <input type="number" step="0.01" min="0" required className="input-base pl-8 py-2 text-sm"
                              placeholder="0,00"
                              value={selectedPlatforms[platform.id]?.sale_price ?? ''}
                              onChange={e => setSelectedPlatforms(prev => ({
                                ...prev,
                                [platform.id]: { ...prev[platform.id], sale_price: e.target.value }
                              }))} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ABA: VARIAÇÕES */}
            {activeTab === 'variacoes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                      Variações do produto
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                      Ex: cores, tamanhos. Cada variação tem estoque e preço por plataforma.
                    </p>
                  </div>
                  <button type="button" onClick={addVariation} className="btn-secondary text-xs gap-1.5 px-3 py-2">
                    <Plus size={14} /> Adicionar
                  </button>
                </div>

                {!product?.id && (
                  <div className="rounded-xl p-3 text-sm text-center" style={{ background: 'rgba(196,77,240,0.08)', color: '#c44df0' }}>
                    💡 Salve o produto primeiro para adicionar variações
                  </div>
                )}

                {loadingVariations ? (
                  <div className="h-20 rounded-xl shimmer" />
                ) : variations.length === 0 ? (
                  <div className="text-center py-8 rounded-2xl" style={{ background: 'rgb(var(--bg-tertiary))' }}>
                    <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                      Nenhuma variação cadastrada
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                      Clique em "Adicionar" para criar variações de cor, tamanho, etc.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {variations.map((variation, index) => (
                      <div key={index} className="rounded-2xl p-4 space-y-3"
                        style={{ background: 'rgb(var(--bg-tertiary))', border: '1px solid rgb(var(--border))' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: 'rgb(var(--text-muted))' }}>
                            Variação {index + 1}
                          </span>
                          <button type="button" onClick={() => removeVariation(index)}
                            className="p-1 rounded-lg hover:bg-red-500/10 transition-colors">
                            <Trash2 size={14} style={{ color: '#ef4444' }} />
                          </button>
                        </div>

                        {/* Nome e SKU da variação */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs mb-1 block font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                              Nome da variação *
                            </label>
                            <input type="text" className="input-base py-2 text-sm"
                              placeholder="Ex: Cor 01 - Nude" required
                              value={variation.name}
                              onChange={e => setVariations(prev => prev.map((v, i) =>
                                i === index ? { ...v, name: e.target.value } : v
                              ))} />
                          </div>
                          <div>
                            <label className="text-xs mb-1 block" style={{ color: 'rgb(var(--text-muted))' }}>
                              SKU da variação
                            </label>
                            <input type="text" className="input-base py-2 text-sm"
                              placeholder="Ex: BAT-001-NU"
                              value={variation.sku}
                              onChange={e => setVariations(prev => prev.map((v, i) =>
                                i === index ? { ...v, sku: e.target.value } : v
                              ))} />
                          </div>
                        </div>

                        {/* Preços por plataforma ativa */}
                        {platforms.filter(p => selectedPlatforms[p.id]?.active).length > 0 && (
                          <div>
                            <p className="text-xs mb-2 font-medium" style={{ color: 'rgb(var(--text-muted))' }}>
                              Preço de venda por plataforma
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {platforms.filter(p => selectedPlatforms[p.id]?.active).map(platform => (
                                <div key={platform.id}>
                                  <label className="text-xs mb-1 flex items-center gap-1" style={{ color: 'rgb(var(--text-muted))' }}>
                                    <div className="w-2 h-2 rounded-full" style={{ background: platform.color }} />
                                    {platform.name}
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>R$</span>
                                    <input type="number" step="0.01" min="0" className="input-base pl-7 py-1.5 text-sm"
                                      placeholder="0,00"
                                      value={variation.prices[platform.id] ?? ''}
                                      onChange={e => setVariations(prev => prev.map((v, i) =>
                                        i === index ? { ...v, prices: { ...v.prices, [platform.id]: e.target.value } } : v
                                      ))} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {platforms.filter(p => selectedPlatforms[p.id]?.active).length === 0 && (
                          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                            ⚠️ Ative plataformas na aba "Plataformas" para definir preços por variação.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Salvar produto'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}