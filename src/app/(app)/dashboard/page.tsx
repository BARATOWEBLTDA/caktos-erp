import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatPercent, calculateVariation } from '@/lib/utils'
import { TrendingUp, TrendingDown, Package, Store, Wallet, AlertTriangle, Star, Receipt } from 'lucide-react'
import SalesTrendChart from '@/components/dashboard/SalesTrendChart'
import TopProductsList from '@/components/dashboard/TopProductsList'
import CashSummary from '@/components/dashboard/CashSummary'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id, store:stores(tax_rate)')
    .eq('id', user!.id)
    .single()

  const storeId = profile?.store_id

  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('is_active', true)

  const { count: activePlatforms } = await supabase
    .from('platforms')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('is_active', true)

  const { data: lowStockItems } = await supabase
    .from('current_stock')
    .select('*')
    .eq('store_id', storeId)
    .eq('low_stock', true)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Vendas do dia com itens para calcular CMV
  const { data: salesTodayFull } = await supabase
    .from('sales')
    .select(`
      id, total, net_profit, total_fees, tax_amount,
      items:sale_items(quantity, unit_price, purchase_price, subtotal)
    `)
    .eq('store_id', storeId)
    .gte('sale_date', today.toISOString())

  const totalToday = salesTodayFull?.reduce((s, v) => s + Number(v.total), 0) ?? 0
  const profitToday = salesTodayFull?.reduce((s, v) => s + Number(v.net_profit), 0) ?? 0
  const taxesToday = salesTodayFull?.reduce((s, v) => s + Number(v.total_fees), 0) ?? 0

  // CMV do dia = soma dos custos dos itens vendidos
  const cmvToday = salesTodayFull?.reduce((s, sale) => {
    const saleCost = (sale.items as Array<{ quantity: number; purchase_price: number }>)
      ?.reduce((si, item) => si + item.quantity * Number(item.purchase_price), 0) ?? 0
    return s + saleCost
  }, 0) ?? 0

  const grossProfitToday = totalToday - cmvToday // Lucro bruto (sem taxas)

  // Vendas da semana
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const { data: salesWeek } = await supabase
    .from('sales')
    .select('total, net_profit')
    .eq('store_id', storeId)
    .gte('sale_date', weekStart.toISOString())

  const totalWeek = salesWeek?.reduce((s, v) => s + Number(v.total), 0) ?? 0

  // Vendas do mês
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: salesMonthFull } = await supabase
    .from('sales')
    .select(`
      total, net_profit, total_fees,
      items:sale_items(quantity, purchase_price)
    `)
    .eq('store_id', storeId)
    .gte('sale_date', monthStart.toISOString())

  const totalMonth = salesMonthFull?.reduce((s, v) => s + Number(v.total), 0) ?? 0
  const profitMonth = salesMonthFull?.reduce((s, v) => s + Number(v.net_profit), 0) ?? 0
  const taxesMonth = salesMonthFull?.reduce((s, v) => s + Number(v.total_fees), 0) ?? 0
  const cmvMonth = salesMonthFull?.reduce((s, sale) => {
    const saleCost = (sale.items as Array<{ quantity: number; purchase_price: number }>)
      ?.reduce((si, item) => si + item.quantity * Number(item.purchase_price), 0) ?? 0
    return s + saleCost
  }, 0) ?? 0
  const grossProfitMonth = totalMonth - cmvMonth

  // Vendas mês anterior
  const lastMonthStart = new Date()
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1, 1)
  lastMonthStart.setHours(0, 0, 0, 0)
  const lastMonthEnd = new Date()
  lastMonthEnd.setDate(0)
  lastMonthEnd.setHours(23, 59, 59, 999)

  const { data: salesLastMonth } = await supabase
    .from('sales')
    .select('total, net_profit')
    .eq('store_id', storeId)
    .gte('sale_date', lastMonthStart.toISOString())
    .lte('sale_date', lastMonthEnd.toISOString())

  const totalLastMonth = salesLastMonth?.reduce((s, v) => s + Number(v.total), 0) ?? 0
  const monthVariation = calculateVariation(totalMonth, totalLastMonth)

  const { data: topProducts } = await supabase
    .from('top_products')
    .select('*')
    .eq('store_id', storeId)
    .limit(5)

  const { data: financialHealth } = await supabase
    .from('financial_health')
    .select('*')
    .eq('store_id', storeId)
    .single()

  const { data: bankBalance } = await supabase
    .from('bank_balance_history')
    .select('balance')
    .eq('store_id', storeId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single()

  const { data: platforms } = await supabase
    .from('platforms')
    .select('name, balance, color')
    .eq('store_id', storeId)
    .eq('is_active', true)

  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const { count: dueSoonPayables } = await supabase
    .from('accounts_payable')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'pendente')
    .lte('due_date', nextWeek.toISOString().split('T')[0])

  const { count: overduePayables } = await supabase
    .from('accounts_payable')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'vencido')

  const bankBalanceValue = bankBalance?.balance ?? 0
  const platformsTotal = platforms?.reduce((s, p) => s + Number(p.balance), 0) ?? 0
  const totalCash = bankBalanceValue + platformsTotal

  const hasAnySaleToday = (salesTodayFull?.length ?? 0) > 0

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* Alertas */}
      {((lowStockItems?.length ?? 0) > 0 || (overduePayables ?? 0) > 0 || (dueSoonPayables ?? 0) > 0) && (
        <div className="flex flex-wrap gap-3">
          {(lowStockItems?.length ?? 0) > 0 && (
            <a href="/produtos"
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
              style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', color: '#eab308' }}>
              <AlertTriangle size={16} />
              {lowStockItems!.length} produto{lowStockItems!.length > 1 ? 's' : ''} com estoque baixo
            </a>
          )}
          {(overduePayables ?? 0) > 0 && (
            <a href="/financeiro"
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
              <AlertTriangle size={16} />
              {overduePayables} conta{(overduePayables ?? 0) > 1 ? 's' : ''} vencida{(overduePayables ?? 0) > 1 ? 's' : ''}
            </a>
          )}
          {(dueSoonPayables ?? 0) > 0 && (
            <a href="/financeiro"
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
              style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', color: '#f97316' }}>
              <AlertTriangle size={16} />
              {dueSoonPayables} conta{(dueSoonPayables ?? 0) > 1 ? 's' : ''} vencendo em 7 dias
            </a>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(196, 77, 240, 0.1)' }}>
            <Package size={20} style={{ color: '#c44df0' }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
              {totalProducts ?? 0}
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Produtos ativos</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(244, 63, 94, 0.1)' }}>
            <Store size={20} style={{ color: '#f43f5e' }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'rgb(var(--text-primary))' }}>
              {activePlatforms ?? 0}
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Plataformas ativas</p>
          </div>
        </div>

        <div className="card p-5 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Faturamento Semana</p>
          <p className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Sora, sans-serif' }}>
            {formatCurrency(totalWeek)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
            {salesWeek?.length ?? 0} pedidos esta semana
          </p>
        </div>

        <div className="card p-5 relative overflow-hidden">
          <p className="text-xs font-medium mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Mês vs Anterior</p>
          <p className="text-2xl font-bold" style={{
            fontFamily: 'Sora, sans-serif',
            color: monthVariation >= 0 ? '#10b981' : '#ef4444'
          }}>
            {monthVariation > 0 ? '+' : ''}{formatPercent(monthVariation)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
            {formatCurrency(totalMonth)} este mês
          </p>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
            {monthVariation >= 0
              ? <TrendingUp size={48} style={{ color: '#10b981' }} />
              : <TrendingDown size={48} style={{ color: '#ef4444' }} />
            }
          </div>
        </div>
      </div>

      {/* BLOCO CMV — Vendas do Dia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hoje */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={18} style={{ color: '#c44df0' }} />
            <h2 className="section-title">Resultado de Hoje</h2>
          </div>

          {!hasAnySaleToday ? (
            <div className="text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>
              <p className="text-sm">Nenhuma venda registrada hoje ainda.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {[
                {
                  label: 'Faturamento',
                  value: formatCurrency(totalToday),
                  color: 'rgb(var(--text-primary))',
                  bg: 'transparent',
                  bold: false,
                  border: true,
                },
                {
                  label: 'CMV (custo das mercadorias)',
                  value: `- ${formatCurrency(cmvToday)}`,
                  color: '#ef4444',
                  bg: 'transparent',
                  bold: false,
                  border: true,
                },
                {
                  label: 'Lucro bruto',
                  value: formatCurrency(grossProfitToday),
                  color: '#3b82f6',
                  bg: 'rgba(59,130,246,0.06)',
                  bold: true,
                  border: true,
                },
                {
                  label: 'Taxas + impostos',
                  value: `- ${formatCurrency(taxesToday)}`,
                  color: '#f97316',
                  bg: 'transparent',
                  bold: false,
                  border: true,
                },
                {
                  label: 'Lucro líquido',
                  value: formatCurrency(profitToday),
                  color: profitToday >= 0 ? '#10b981' : '#ef4444',
                  bg: profitToday >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                  bold: true,
                  border: false,
                },
              ].map((row) => (
                <div key={row.label}
                  className={`flex items-center justify-between px-3 py-3 ${row.border ? 'border-b' : ''}`}
                  style={{
                    borderColor: 'rgb(var(--border))',
                    background: row.bg,
                    borderRadius: row.bg !== 'transparent' ? '8px' : '0',
                  }}>
                  <span className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                    {row.label}
                  </span>
                  <span className={`text-sm ${row.bold ? 'font-bold' : 'font-medium'}`}
                    style={{ color: row.color, fontFamily: row.bold ? 'Sora, sans-serif' : 'inherit' }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {/* Margem líquida */}
              <div className="mt-3 pt-3 border-t flex items-center justify-between"
                style={{ borderColor: 'rgb(var(--border))' }}>
                <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  Margem líquida do dia
                </span>
                <span className="text-sm font-bold"
                  style={{ color: profitToday >= 0 ? '#10b981' : '#ef4444' }}>
                  {totalToday > 0 ? formatPercent((profitToday / totalToday) * 100) : '0%'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Mês */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={18} style={{ color: '#3b82f6' }} />
            <h2 className="section-title">Resultado do Mês</h2>
          </div>

          <div className="space-y-0">
            {[
              {
                label: 'Faturamento',
                value: formatCurrency(totalMonth),
                color: 'rgb(var(--text-primary))',
                bg: 'transparent',
                bold: false,
                border: true,
              },
              {
                label: 'CMV (custo das mercadorias)',
                value: `- ${formatCurrency(cmvMonth)}`,
                color: '#ef4444',
                bg: 'transparent',
                bold: false,
                border: true,
              },
              {
                label: 'Lucro bruto',
                value: formatCurrency(grossProfitMonth),
                color: '#3b82f6',
                bg: 'rgba(59,130,246,0.06)',
                bold: true,
                border: true,
              },
              {
                label: 'Taxas + impostos',
                value: `- ${formatCurrency(taxesMonth)}`,
                color: '#f97316',
                bg: 'transparent',
                bold: false,
                border: true,
              },
              {
                label: 'Lucro líquido',
                value: formatCurrency(profitMonth),
                color: profitMonth >= 0 ? '#10b981' : '#ef4444',
                bg: profitMonth >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                bold: true,
                border: false,
              },
            ].map((row) => (
              <div key={row.label}
                className={`flex items-center justify-between px-3 py-3 ${row.border ? 'border-b' : ''}`}
                style={{
                  borderColor: 'rgb(var(--border))',
                  background: row.bg,
                  borderRadius: row.bg !== 'transparent' ? '8px' : '0',
                }}>
                <span className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                  {row.label}
                </span>
                <span className={`text-sm ${row.bold ? 'font-bold' : 'font-medium'}`}
                  style={{ color: row.color, fontFamily: row.bold ? 'Sora, sans-serif' : 'inherit' }}>
                  {row.value}
                </span>
              </div>
            ))}

            <div className="mt-3 pt-3 border-t flex items-center justify-between"
              style={{ borderColor: 'rgb(var(--border))' }}>
              <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                Margem líquida do mês
              </span>
              <span className="text-sm font-bold"
                style={{ color: profitMonth >= 0 ? '#10b981' : '#ef4444' }}>
                {totalMonth > 0 ? formatPercent((profitMonth / totalMonth) * 100) : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Gráfico + Caixa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5">
          <h2 className="section-title mb-4">Vendas — Últimos 30 dias</h2>
          <SalesTrendChart storeId={storeId!} />
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} style={{ color: '#c44df0' }} />
            <h2 className="section-title">Caixa</h2>
          </div>
          <CashSummary
            bankBalance={bankBalanceValue}
            platformBalances={platforms?.map(p => ({
              name: p.name,
              balance: Number(p.balance),
              color: p.color,
            })) ?? []}
            total={totalCash}
          />
        </div>
      </div>

      {/* Row: Top produtos + Saúde financeira */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star size={18} style={{ color: '#c44df0' }} />
            <h2 className="section-title">Produtos mais vendidos</h2>
          </div>
          <TopProductsList products={topProducts ?? []} />
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Saúde do Estoque</h2>
          <div className="space-y-4">
            {[
              { label: 'Valor em Estoque (custo)', value: formatCurrency(Number(financialHealth?.stock_cost_value ?? 0)), sub: 'Custo de aquisição', color: '#3b82f6' },
              { label: 'Faturamento Potencial', value: formatCurrency(Number(financialHealth?.stock_sale_value ?? 0)), sub: 'Preço de venda projetado', color: '#c44df0' },
              { label: 'Lucro Bruto Potencial', value: formatCurrency(Number(financialHealth?.potential_profit ?? 0)), sub: 'Sem descontar taxas de plataforma', color: '#10b981' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b last:border-0"
                style={{ borderColor: 'rgb(var(--border))' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{item.label}</p>
                  <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{item.sub}</p>
                </div>
                <p className="text-base font-bold" style={{ color: item.color, fontFamily: 'Sora, sans-serif' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}