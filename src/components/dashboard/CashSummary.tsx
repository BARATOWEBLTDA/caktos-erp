'use client'

import { formatCurrency } from '@/lib/utils'
import { Building2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface PlatformBalance {
  name: string
  balance: number
  color: string
}

interface CashSummaryProps {
  bankBalance: number
  platformBalances: PlatformBalance[]
  total: number
}

export default function CashSummary({ bankBalance, platformBalances, total }: CashSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Banco */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
            <Building2 size={16} style={{ color: '#3b82f6' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
            Banco
          </span>
        </div>
        <span className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
          {formatCurrency(bankBalance)}
        </span>
      </div>

      {/* Divisor */}
      <div className="border-t" style={{ borderColor: 'rgb(var(--border))' }} />

      {/* Plataformas */}
      {platformBalances.map((platform) => (
        <div key={platform.name} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${platform.color}20` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: platform.color }} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
              {platform.name}
            </span>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
            {formatCurrency(platform.balance)}
          </span>
        </div>
      ))}

      {/* Total */}
      <div className="border-t pt-4" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'rgb(var(--text-secondary))' }}>
            Total disponível
          </span>
          <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'Sora, sans-serif' }}>
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Link */}
      <Link
        href="/caixa"
        className="flex items-center gap-2 text-xs font-medium transition-colors"
        style={{ color: '#c44df0' }}
      >
        Ver detalhes do caixa
        <ExternalLink size={12} />
      </Link>
    </div>
  )
}
