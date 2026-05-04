'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Sun, Moon, LogOut, Settings, User } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/produtos': 'Produtos',
  '/estoque': 'Estoque',
  '/categorias': 'Categorias',
  '/fornecedores': 'Fornecedores',
  '/plataformas': 'Plataformas',
  '/vendas': 'Vendas',
  '/reembolsos': 'Reembolsos',
  '/financeiro': 'Movimentações Financeiras',
  '/caixa': 'Caixa',
  '/documentos': 'Drive Interno',
}

interface HeaderProps {
  profile: {
    full_name: string | null
    role: string
    store?: { name: string }
  } | null
}

export default function Header({ profile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isDark, setIsDark] = useState(true)
  const [notifications, setNotifications] = useState(0)

  const currentLabel = Object.entries(routeLabels).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? 'ERP'

  useEffect(() => {
    const stored = localStorage.getItem('caktos-theme')
    setIsDark(stored !== 'light')
  }, [])

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('caktos-theme', next)
    setIsDark(next === 'dark')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Até logo!')
    router.push('/login')
  }

  return (
    <header
      className="h-16 shrink-0 flex items-center justify-between px-5 border-b"
      style={{
        background: 'rgb(var(--bg-card))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      {/* Título da página */}
      <div>
        <h1
          className="text-base font-semibold"
          style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}
        >
          {currentLabel}
        </h1>
        <p className="text-xs lg:hidden" style={{ color: 'rgb(var(--text-muted))' }}>
          {profile?.store?.name ?? 'CAKTOS MAKEUP'}
        </p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn-ghost p-2 rounded-xl"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notificações */}
        <button className="btn-ghost p-2 rounded-xl relative">
          <Bell size={18} />
          {notifications > 0 && (
            <span className="notif-dot" />
          )}
        </button>

        {/* Menu do usuário */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="ml-2 flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-[rgb(var(--bg-tertiary))]">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #c44df0, #f43f5e)' }}
              >
                {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="hidden sm:block text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                {profile?.full_name?.split(' ')[0] ?? 'Usuário'}
              </span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-48 rounded-2xl p-1.5 animate-scale-in"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid rgb(var(--border))',
                boxShadow: 'var(--shadow-modal)',
              }}
            >
              <div className="px-3 py-2 mb-1">
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                  {profile?.full_name ?? 'Usuário'}
                </p>
                <p className="text-xs capitalize" style={{ color: 'rgb(var(--text-muted))' }}>
                  {profile?.role ?? 'admin'}
                </p>
              </div>

              <DropdownMenu.Separator
                className="my-1 h-px"
                style={{ background: 'rgb(var(--border))' }}
              />

              <DropdownMenu.Item
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm cursor-pointer outline-none transition-colors',
                )}
                style={{ color: 'rgb(var(--text-secondary))' }}
                onSelect={() => router.push('/perfil')}
              >
                <User size={15} />
                Meu Perfil
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm cursor-pointer outline-none transition-colors"
                style={{ color: 'rgb(var(--text-secondary))' }}
                onSelect={() => router.push('/configuracoes')}
              >
                <Settings size={15} />
                Configurações
              </DropdownMenu.Item>

              <DropdownMenu.Separator
                className="my-1 h-px"
                style={{ background: 'rgb(var(--border))' }}
              />

              <DropdownMenu.Item
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm cursor-pointer outline-none transition-colors text-rose-500"
                onSelect={handleLogout}
              >
                <LogOut size={15} />
                Sair
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}