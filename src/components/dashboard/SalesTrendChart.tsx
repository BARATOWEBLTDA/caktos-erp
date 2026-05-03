'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'

interface ChartData {
  date: string
  label: string
  revenue: number
  profit: number
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 text-sm"
      style={{
        background: 'rgb(var(--bg-card))',
        border: '1px solid rgb(var(--border))',
        boxShadow: 'var(--shadow-modal)',
      }}
    >
      <p className="font-medium mb-2" style={{ color: 'rgb(var(--text-primary))' }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: 'rgb(var(--text-secondary))' }}>
            {entry.name === 'revenue' ? 'Faturamento' : 'Lucro'}:
          </span>
          <span className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SalesTrendChart({ storeId }: { storeId: string }) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i))
      const startDate = days[0]
      startDate.setHours(0, 0, 0, 0)

      const { data: sales } = await supabase
        .from('sales')
        .select('sale_date, total, net_profit')
        .eq('store_id', storeId)
        .gte('sale_date', startDate.toISOString())
        .order('sale_date')

      const chartData: ChartData[] = days.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const daySales = sales?.filter(s => s.sale_date.startsWith(dayStr)) ?? []
        return {
          date: dayStr,
          label: format(day, 'dd/MM', { locale: ptBR }),
          revenue: daySales.reduce((s, v) => s + Number(v.total), 0),
          profit: daySales.reduce((s, v) => s + Number(v.net_profit), 0),
        }
      })

      setData(chartData)
      setLoading(false)
    }
    load()
  }, [storeId])

  if (loading) {
    return (
      <div className="h-56 rounded-xl shimmer" />
    )
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c44df0" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#c44df0" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgb(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'rgb(var(--text-muted))' }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgb(var(--text-muted))' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#c44df0"
            strokeWidth={2}
            fill="url(#gradRevenue)"
          />
          <Area
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradProfit)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
