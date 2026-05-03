'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, BarChart3, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Tag, Truck, Store, RefreshCcw, Wallet, FolderOpen } from 'lucide-react'

const mainItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { href: '/financeiro', label: 'Financeiro', icon: BarChart3 },
]

const moreItems = [
  { href: '/categorias', label: 'Categorias', icon: Tag },
  { href: '/fornecedores', label: 'Fornecedores', icon: Truck },
  { href: '/plataformas', label: 'Plataformas', icon: Store },
  { href: '/reembolsos', label: 'Reembolsos', icon: RefreshCcw },
  { href: '/caixa', label: 'Caixa', icon: Wallet },
  { href: '/documentos', label: 'Drive', icon: FolderOpen },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t px-2 py-2 pb-safe"
        style={{
          background: 'rgb(var(--bg-card))',
          borderColor: 'rgb(var(--border))',
          paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
        }}
      >
        {mainItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all',
                active ? 'text-brand-500' : 'text-[rgb(var(--text-muted))]'
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Mais */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl"
          style={{ color: 'rgb(var(--text-muted))' }}
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </nav>

      {/* Modal de mais itens */}
      <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 animate-slide-up"
            style={{ background: 'rgb(var(--bg-card))' }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgb(var(--border-strong))' }} />
            <Dialog.Title className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--text-muted))' }}>
              Mais módulos
            </Dialog.Title>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all',
                      active
                        ? 'bg-brand-500/10 text-brand-500'
                        : 'text-[rgb(var(--text-secondary))]'
                    )}
                    style={{ background: active ? undefined : 'rgb(var(--bg-tertiary))' }}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </Link>
                )
              })}
            </div>
            <div className="h-4" />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
