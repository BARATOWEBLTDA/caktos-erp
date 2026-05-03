'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Package, CreditCard, AlertTriangle, Check } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import type { Notification } from '@/types'

export default function NotificationsPanel() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data ?? [])
    }
    load()
  }, [])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const icons: Record<string, React.ReactNode> = {
    low_stock: <Package size={16} style={{ color: '#eab308' }} />,
    overdue_payable: <CreditCard size={16} style={{ color: '#ef4444' }} />,
    due_soon_payable: <AlertTriangle size={16} style={{ color: '#f97316' }} />,
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'rgb(var(--text-muted))' }} />
        <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
          Nenhuma notificação pendente
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map(notif => (
        <div key={notif.id}
          className="flex items-start gap-3 rounded-xl p-3"
          style={{ background: 'rgb(var(--bg-tertiary))' }}>
          <div className="mt-0.5 shrink-0">
            {icons[notif.type] ?? <Bell size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
              {notif.title}
            </p>
            {notif.message && (
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                {notif.message}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
              {formatRelativeDate(notif.created_at)}
            </p>
          </div>
          <button
            onClick={() => markRead(notif.id)}
            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-green-500/10"
            title="Marcar como lida"
          >
            <Check size={14} style={{ color: '#10b981' }} />
          </button>
        </div>
      ))}
    </div>
  )
}
