'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PROFILES = [
  { id: 'bruno', name: 'Bruno', avatar: null as string | null, role: 'Administrador' },
  { id: 'ademir', name: 'Ademir', avatar: null as string | null, role: 'Administrador' },
]

export default function ProfilesPage() {
  const router = useRouter()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -999, y: -999 })
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number

    interface Particle {
      x: number; y: number; ox: number; oy: number
      size: number; speedX: number; speedY: number
      color: string; alpha: number; pulse: number; pulseSpeed: number
    }

    let W = 0, H = 0
    let particles: Particle[] = []

    function resize() {
      W = canvas!.width = window.innerWidth
      H = canvas!.height = window.innerHeight
    }

    function makeParticle(): Particle {
      const x = Math.random() * W
      const y = Math.random() * H
      const purples = [
        'rgba(196,77,240,', 'rgba(147,51,234,',
        'rgba(109,40,217,', 'rgba(216,180,254,',
        'rgba(167,139,250,', 'rgba(88,28,135,',
      ]
      return {
        x, y, ox: x, oy: y,
        size: Math.random() * 2.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        color: purples[Math.floor(Math.random() * purples.length)],
        alpha: Math.random() * 0.7 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      }
    }

    function init() {
      particles = []
      const count = Math.floor((W * H) / 5000)
      for (let i = 0; i < count; i++) particles.push(makeParticle())
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H)
      const { x: mx, y: my } = mouseRef.current
      const radius = 140, strength = 90

      for (const p of particles) {
        p.pulse += p.pulseSpeed
        const a = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse))
        const dx = p.x - mx, dy = p.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < radius && mx > 0) {
          const force = (radius - dist) / radius
          const angle = Math.atan2(dy, dx)
          p.x += Math.cos(angle) * force * strength * 0.08
          p.y += Math.sin(angle) * force * strength * 0.08
        }
        p.x += (p.ox - p.x) * 0.03 + p.speedX
        p.y += (p.oy - p.y) * 0.03 + p.speedY
        p.ox += p.speedX * 0.1
        p.oy += p.speedY * 0.1
        if (p.ox < 0) p.ox = W
        if (p.ox > W) p.ox = 0
        if (p.oy < 0) p.oy = H
        if (p.oy > H) p.oy = 0
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx!.fillStyle = p.color + a + ')'
        ctx!.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p = particles[i], q = particles[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 90) {
            ctx!.beginPath()
            ctx!.moveTo(p.x, p.y)
            ctx!.lineTo(q.x, q.y)
            ctx!.strokeStyle = 'rgba(196,77,240,' + (1 - d / 90) * 0.2 + ')'
            ctx!.lineWidth = 0.5
            ctx!.stroke()
          }
        }
      }

      if (mx > 0) {
        const grad = ctx!.createRadialGradient(mx, my, 0, mx, my, 120)
        grad.addColorStop(0, 'rgba(196,77,240,0.08)')
        grad.addColorStop(1, 'rgba(196,77,240,0)')
        ctx!.beginPath()
        ctx!.arc(mx, my, 120, 0, Math.PI * 2)
        ctx!.fillStyle = grad
        ctx!.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    init()
    draw()

    const onResize = () => { cancelAnimationFrame(animId); resize(); init(); draw() }
    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    const onLeave = () => { mouseRef.current = { x: -999, y: -999 } }

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  async function handleSelect(profileId: string) {
    localStorage.setItem('selected_profile', profileId)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        last_profile_name: profileId,
        last_profile_access: new Date().toISOString(),
      }).eq('id', user.id)
    }
    router.push('/dashboard')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#0d0015' }}>

      <canvas ref={canvasRef} className="absolute inset-0"
        style={{ zIndex: 0, width: '100%', height: '100%' }} />

      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(88,28,135,0.35) 0%, transparent 70%)', top: '5%', left: '0%', filter: 'blur(60px)' }} />
        <div className="absolute w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.3) 0%, transparent 70%)', bottom: '10%', right: '5%', filter: 'blur(70px)' }} />
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(196,77,240,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(196,77,240,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
      </div>

      <div className="relative flex flex-col items-center" style={{ zIndex: 1 }}>
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #c44df0)', boxShadow: '0 0 20px rgba(196,77,240,0.5)' }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: 'Sora, sans-serif' }}>C</span>
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif', letterSpacing: '0.05em' }}>
              CAKTOS MAKEUP
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'rgba(196,77,240,0.8)' }}>Quem está acessando?</p>
        </div>

        <div className="flex gap-10">
          {PROFILES.map(profile => (
            <button
              key={profile.id}
              onClick={() => handleSelect(profile.id)}
              onMouseEnter={() => setHovered(profile.id)}
              onMouseLeave={() => setHovered(null)}
              className="flex flex-col items-center gap-4 p-6 rounded-3xl cursor-pointer"
              style={{
                background: hovered === profile.id ? 'rgba(196,77,240,0.15)' : 'rgba(255,255,255,0.03)',
                border: hovered === profile.id ? '1px solid rgba(196,77,240,0.6)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: hovered === profile.id ? '0 0 30px rgba(196,77,240,0.3), 0 20px 40px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.3)',
                minWidth: '160px',
                transform: hovered === profile.id ? 'translateY(-12px) scale(1.05)' : 'translateY(0) scale(1)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
              <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                  boxShadow: hovered === profile.id ? '0 0 30px rgba(196,77,240,0.6)' : '0 4px 20px rgba(0,0,0,0.4)',
                  border: hovered === profile.id ? '2px solid rgba(196,77,240,0.8)' : '2px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                }}>
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {profile.name[0]}
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>{profile.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(196,77,240,0.7)' }}>{profile.role}</p>
              </div>
              {hovered === profile.id && (
                <div className="text-xs font-semibold px-4 py-1.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #c44df0)', color: 'white' }}>
                  Entrar →
                </div>
              )}
            </button>
          ))}
        </div>

        <button onClick={handleLogout}
          className="mt-12 text-xs font-medium transition-all"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
          Sair da conta
        </button>

        <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
          BARATO WEB LTDA. · CAKTOS ERP
        </p>
      </div>
    </div>
  )
}