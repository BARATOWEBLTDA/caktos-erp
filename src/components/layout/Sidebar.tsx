'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Wallet,
  RefreshCcw,
  Store,
  FolderOpen,
  Truck,
  Tag,
  ChevronRight,
  Sparkles,
  Boxes,
} from 'lucide-react'

const navItems = [
  {
    group: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Catálogo',
    items: [
      { href: '/produtos', label: 'Produtos', icon: Package },
      { href: '/estoque', label: 'Estoque', icon: Boxes },
      { href: '/categorias', label: 'Categorias', icon: Tag },
      { href: '/fornecedores', label: 'Fornecedores', icon: Truck },
      { href: '/plataformas', label: 'Plataformas', icon: Store },
    ],
  },
  {
    group: 'Operações',
    items: [
      { href: '/vendas', label: 'Vendas', icon: ShoppingCart },
      { href: '/reembolsos', label: 'Reembolsos', icon: RefreshCcw },
    ],
  },
  {
    group: 'Financeiro',
    items: [
      { href: '/financeiro', label: 'Movimentações', icon: BarChart3 },
      { href: '/caixa', label: 'Caixa', icon: Wallet },
    ],
  },
  {
    group: 'Documentos',
    items: [
      { href: '/documentos', label: 'Drive', icon: FolderOpen },
    ],
  },
]

interface SidebarProps {
  profile: {
    full_name: string | null
    role: string
    store?: { name: string; company_name: string; logo_url: string | null }
  } | null
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden lg:flex flex-col w-64 shrink-0 border-r overflow-y-auto"
      style={{
        background: 'rgb(var(--bg-sidebar))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      {/* Logo / Marca */}
      <div className="p-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center gap-3">
          {profile?.store?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.store.logo_url}
              alt="Logo"
              className="w-10 h-10 rounded-xl object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #c44df0, #f43f5e)' }}
            >
              CM
            </div>
          )}
          <div className="min-w-0">
            <div
              className="text-sm font-bold truncate"
              style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}
            >
              {profile?.store?.name ?? 'CAKTOS MAKEUP'}
            </div>
            <div className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>
              {profile?.store?.company_name ?? 'BARATO WEB LTDA.'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-5">
        {navItems.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgb(var(--text-muted))' }}>
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn('sidebar-item group', active && 'active')}
                  >
                    <Icon size={18} className={cn(
                      'shrink-0 transition-colors',
                      active ? 'text-brand-500' : 'text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-primary))]'
                    )} />
                    <span className="flex-1">{item.label}</span>
                    {active && (
                      <ChevronRight size={14} className="text-brand-500 opacity-60" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center gap-3 rounded-xl p-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #c44df0, #f43f5e)' }}
          >
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>
              {profile?.full_name ?? 'Usuário'}
            </div>
            <div className="text-[11px] capitalize" style={{ color: 'rgb(var(--text-muted))' }}>
              {profile?.role ?? 'admin'}
            </div>
          </div>
          <Sparkles size={14} style={{ color: 'rgb(var(--text-muted))' }} />
        </div>
      </div>
    </aside>
  )
}