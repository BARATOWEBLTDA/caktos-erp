import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import Header from '@/components/layout/Header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, store:stores(*)')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'rgb(var(--bg-secondary))' }}>
      {/* Sidebar Desktop */}
      <Sidebar profile={profile} />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header profile={profile} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 pb-24 lg:pb-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Nav Mobile */}
      <MobileNav />
    </div>
  )
}
