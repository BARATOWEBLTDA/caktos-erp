import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ============================================================
// CLASS NAMES
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// FORMATADORES
// ============================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  return format(new Date(date), pattern, { locale: ptBR })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) return `Hoje às ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `Ontem às ${format(d, 'HH:mm')}`
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ============================================================
// CÁLCULO DE LUCRO POR PLATAFORMA
// ============================================================

import type { Platform, ProductPlatform, ProfitCalculation } from '@/types'

export function calculatePlatformProfit(
  salePrice: number,
  purchasePrice: number,
  platform: Platform,
  productPlatform?: ProductPlatform,
  shippingCost = 0,
  taxRate = 4
): ProfitCalculation {
  const commission = productPlatform?.custom_commission ?? platform.base_commission
  const commissionAmount = (salePrice * commission) / 100
  const fixedFee = platform.fixed_fee

  // Taxas opcionais ativas
  let optionalFeesAmount = 0
  if (platform.has_optional_fees && platform.optional_fees) {
    const activeIds = productPlatform?.active_optional_fees ?? []
    platform.optional_fees.forEach((fee) => {
      if (activeIds.includes(fee.id) || fee.active) {
        optionalFeesAmount += (salePrice * fee.rate) / 100
      }
    })
  }

  const taxAmount = (salePrice * taxRate) / 100
  const totalDeductions = commissionAmount + fixedFee + optionalFeesAmount + taxAmount + shippingCost
  const netProfit = salePrice - purchasePrice - totalDeductions
  const profitMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0

  return {
    platform_id: platform.id,
    platform_name: platform.name,
    platform_color: platform.color,
    sale_price: salePrice,
    commission_amount: commissionAmount,
    fixed_fee: fixedFee,
    optional_fees_amount: optionalFeesAmount,
    tax_amount: taxAmount,
    total_deductions: totalDeductions,
    net_profit: netProfit,
    profit_margin: profitMargin,
  }
}

// ============================================================
// VARIAÇÕES E COMPARAÇÕES
// ============================================================

export function calculateVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function isPositiveVariation(variation: number): boolean {
  return variation >= 0
}

// ============================================================
// SLUGIFY
// ============================================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ============================================================
// CORES
// ============================================================

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ============================================================
// STATUS LABELS
// ============================================================

export const accountStatusLabel: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
}

export const accountStatusColor: Record<string, string> = {
  pendente: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
  pago: 'text-green-500 bg-green-50 dark:bg-green-950/30',
  vencido: 'text-red-500 bg-red-50 dark:bg-red-950/30',
  cancelado: 'text-gray-500 bg-gray-50 dark:bg-gray-950/30',
}

export const refundStatusLabel: Record<string, string> = {
  aberto: 'Aberto',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  concluido: 'Concluído',
}

export const supplierTypeLabel: Record<string, string> = {
  makeup: 'Maquiagem',
  insumo: 'Insumo',
  embalagem: 'Embalagem',
  outro: 'Outro',
}

export const documentTypeLabel: Record<string, string> = {
  nota_fiscal: 'Nota Fiscal',
  comprovante: 'Comprovante',
  contrato: 'Contrato',
  outro: 'Outro',
}

// ============================================================
// DEBOUNCE
// ============================================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
