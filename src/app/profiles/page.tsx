'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PROFILES = [
  {
    id: 'bruno',
    name: 'Bruno',
    avatar: null, // Substitua por URL da foto
    role: 'Administrador',
  },
  {
    id: 'ademir',
    name: 'Ademir',
    avatar: null, // Substitua por URL da foto
    role: 'Administrador',
  },
]

export default function ProfilesPage() {
  const router = useRouter()
  const [hovered, setHovered] = useState<string | null>(null)

  function handleSelect(profileId: string) {
    // Salva o perfil selecionado e vai para o login
    localStorage.setItem('selected_profile', profileId)
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#0d0015' }}>

      {/* Fundo animado */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.15); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, 40px) scale(1.05); }
          66% { transform: translate(-20px, -20px) scale(0.95); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .orb1 { animation: float1 8s ease-in-out infinite; }
        .orb2 { animation: float2 10s ease-in-out infinite; }
        .orb3 { animation: float3 12s ease-in-out infinite; }
        .pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .profile-card {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .profile-card:hover {
          transform: translateY(-12px) scale(1.05);
        }
        .neon-border {
          box-shadow: 0 0 20px rgba(196,77,240,0.5), 0 0 40px rgba(196,77,240,0.2), inset 0 0 20px rgba(196,77,240,0.05);
          border: 1px solid rgba(196,77,240,0.6);
        }
        .avatar-glow {
          box-shadow: 0 0 30px rgba(196,77,240,0.6), 0 0 60px rgba(196,77,240,0.3);
        }
      `}</style>

      {/* Orbs de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb1 absolute w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(147,51,234,0.4) 0%, transparent 70%)',
            top: '10%', left: '5%',
            filter: 'blur(40px)',
          }} />
        <div className="orb2 absolute w-80 h-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(196,77,240,0.35) 0%, transparent 70%)',
            bottom: '15%', right: '8%',
            filter: 'blur(50px)',
          }} />
        <div className="orb3 absolute w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(88,28,135,0.5) 0%, transparent 70%)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(60px)',
          }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(196,77,240,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(196,77,240,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
      </div>

      {/* Logo / Título */}
      <div className="relative z-10 text-center mb-14">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center pulse-glow"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #c44df0)', boxShadow: '0 0 20px rgba(196,77,240,0.5)' }}>
            <span className="text-white font-bold text-lg" style={{ fontFamily: 'Sora, sans-serif' }}>C</span>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif', letterSpacing: '0.05em' }}>
            CAKTOS MAKEUP
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'rgba(196,77,240,0.8)' }}>
          Quem está acessando?
        </p>
      </div>

      {/* Cards de perfil */}
      <div className="relative z-10 flex gap-10">
        {PROFILES.map(profile => (
          <button
            key={profile.id}
            onClick={() => handleSelect(profile.id)}
            onMouseEnter={() => setHovered(profile.id)}
            onMouseLeave={() => setHovered(null)}
            className="profile-card flex flex-col items-center gap-4 p-6 rounded-3xl cursor-pointer"
            style={{
              background: hovered === profile.id
                ? 'rgba(196,77,240,0.15)'
                : 'rgba(255,255,255,0.03)',
              border: hovered === profile.id
                ? '1px solid rgba(196,77,240,0.6)'
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow: hovered === profile.id
                ? '0 0 30px rgba(196,77,240,0.3), 0 20px 40px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(0,0,0,0.3)',
              minWidth: '160px',
            }}>

            {/* Avatar */}
            <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                ...(hovered === profile.id ? {
                  boxShadow: '0 0 30px rgba(196,77,240,0.6), 0 0 60px rgba(196,77,240,0.3)',
                } : {
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }),
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

            {/* Nome */}
            <div className="text-center">
              <p className="text-base font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                {profile.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(196,77,240,0.7)' }}>
                {profile.role}
              </p>
            </div>

            {/* Seta ao hover */}
            {hovered === profile.id && (
              <div className="text-xs font-semibold px-4 py-1.5 rounded-full"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #c44df0)', color: 'white' }}>
                Entrar →
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Rodapé */}
      <p className="relative z-10 mt-16 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
        BARATO WEB LTDA. · CAKTOS ERP
      </p>
    </div>
  )
}