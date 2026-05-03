'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen flex">
      {/* Painel esquerdo — decorativo */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0b0910 0%, #1c1225 50%, #0f0a1a 100%)' }}
      >
        {/* Orbs de fundo */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #c44df0, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f43f5e, transparent)' }} />

        {/* Grid decorativo */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(196,77,240,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(196,77,240,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Conteúdo central */}
        <div className="relative z-10 text-center px-12">
          {/* Logo placeholder */}
          <div className="mb-8 mx-auto w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #c44df0, #f43f5e)' }}
          >
            CM
          </div>

          <h1 className="text-4xl font-bold text-white mb-3"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
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
              <div key={item.label}
                className="rounded-2xl p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-xs text-purple-300 font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-1 lg:max-w-md xl:max-w-lg items-center justify-center p-8"
        style={{ background: 'rgb(var(--bg-primary, 11 9 16))' }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile: logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #c44df0, #f43f5e)' }}
            >
              CM
            </div>
            <div>
              <div className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>CAKTOS MAKEUP</div>
              <div className="text-xs" style={{ color: 'rgb(120 105 150)' }}>BARATO WEB LTDA.</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              Bem-vindo de volta
            </h2>
            <p className="text-sm" style={{ color: 'rgb(120 105 150)' }}>
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
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

            {/* Senha */}
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
                  style={{ color: 'rgb(120 105 150)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-6 py-3 text-base"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs" style={{ color: 'rgb(80 70 100)' }}>
            © 2025 BARATO WEB LTDA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
