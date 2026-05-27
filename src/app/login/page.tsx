'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const PROFILE_NAMES: Record<string, string> = {
  bruno: 'Bruno',
  ademir: 'Ademir',
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)

  useEffect(() => {
    const profile = localStorage.getItem('selected_profile')
    setSelectedProfile(profile)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Painel esquerdo — decorativo (apenas desktop) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0b0910 0%, #1c1225 50%, #0f0a1a 100%)' }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #c44df0, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f43f5e, transparent)' }} />
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(196,77,240,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(196,77,240,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 text-center px-12">
          <div className="mb-8 mx-auto w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #c44df0, #f43f5e)' }}>
            CM
          </div>
          <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
            CAKTOS MAKEUP
          </h1>
          <p className="text-lg text-purple-300 mb-2">Sistema de Gestão Interno</p>
          <p className="text-sm text-purple-400/60">BARATO WEB LTDA.</p>
          <div className="mt-16 grid grid-cols-3 gap-4">
            {[
              { label: 'Produtos', icon: '💄' },
              { label: 'Vendas', icon: '📊' },
              { label: 'Financeiro', icon: '💰' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-xs text-purple-300 font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-1 lg:max-w-md xl:max-w-lg items-center justify-center relative"
        style={{ background: '#0b0910', minHeight: '100dvh' }}>

        {/* Botão voltar para perfis */}
        <button
          onClick={() => router.push('/profiles')}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-sm font-medium transition-all hover:opacity-100 opacity-60"
          style={{ color: '#c44df0' }}>
          <ChevronLeft size={16} />
          Trocar perfil
        </button>

        <div className="w-full max-w-sm px-6 py-8 flex flex-col items-center">

          {/* Logo + perfil selecionado */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold text-white mb-4"
              style={{ background: 'linear-gradient(135deg, #c44df0, #f43f5e)' }}>
              CM
            </div>
            <h1 className="text-2xl font-bold text-white text-center"
              style={{ fontFamily: 'Sora, sans-serif' }}>
              CAKTOS MAKEUP
            </h1>
            <p className="text-sm mt-1 text-center" style={{ color: 'rgb(120 105 150)' }}>
              BARATO WEB LTDA.
            </p>

            {/* Perfil selecionado */}
            {selectedProfile && (
              <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: 'rgba(196,77,240,0.1)', border: '1px solid rgba(196,77,240,0.3)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #c44df0)' }}>
                  {PROFILE_NAMES[selectedProfile]?.[0] ?? '?'}
                </div>
                <span className="text-sm font-medium" style={{ color: '#c44df0' }}>
                  {PROFILE_NAMES[selectedProfile] ?? selectedProfile}
                </span>
              </div>
            )}
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <label className="label text-purple-300/80">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="input-base"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  color: 'white',
                }}
              />
            </div>

            <div>
              <label className="label text-purple-300/80">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-base pr-11"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'white',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgb(120 105 150)' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center mt-2 py-3 text-base">
              {loading
                ? <><Loader2 size={18} className="animate-spin" />Entrando...</>
                : 'Entrar'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}