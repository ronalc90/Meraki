'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Lock,
  Cpu,
  Store,
  LogOut,
  CheckCircle,
  XCircle,
  Phone,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const OPENAI_CONFIGURED = !!(process.env.NEXT_PUBLIC_OPENAI_CONFIGURED === 'true')

interface SectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ background: '#7c3aed' }}
        >
          {icon}
        </div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    toast('Contacta soporte para cambiar contraseña', {
      icon: '🔒',
      style: { borderRadius: '12px', fontSize: '14px' },
    })
    setCurrentPwd('')
    setNewPwd('')
    setConfirmPwd('')
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (!res.ok) throw new Error('logout failed')
      router.push('/login')
    } catch (err) {
      console.error(err)
      toast.error('Error al cerrar sesión')
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-xl">
          <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
          <p className="text-xs text-gray-500">Tu Tienda Meraki</p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-4 space-y-4">
        {/* Perfil */}
        <Section icon={<User className="h-4 w-4" />} title="Perfil">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #f59e0b)' }}
            >
              P
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Paola</p>
              <p className="text-sm text-gray-500">Administradora</p>
              <p className="text-xs text-gray-400 mt-0.5">Tu Tienda Meraki</p>
            </div>
          </div>
        </Section>

        {/* Cambiar contraseña */}
        <Section icon={<Lock className="h-4 w-4" />} title="Cambiar Contraseña">
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Contraseña actual
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="••••••••"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nueva contraseña
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="••••••••"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Confirmar contraseña
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="••••••••"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#7c3aed' }}
            >
              Cambiar contraseña
            </button>
          </form>
        </Section>

        {/* API de IA */}
        <Section icon={<Cpu className="h-4 w-4" />} title="API de IA">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">OpenAI API Key</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Requerida para el asistente de pedidos con IA
              </p>
            </div>
            {OPENAI_CONFIGURED ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" />
                Configurada
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                <XCircle className="h-3.5 w-3.5" />
                No configurada
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            La clave se configura mediante variables de entorno en el servidor. No se muestra por seguridad.
          </p>
        </Section>

        {/* Negocio */}
        <Section icon={<Store className="h-4 w-4" />} title="Negocio">
          <dl className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-sm text-gray-500">Nombre del negocio</dt>
              <dd className="text-sm font-semibold text-gray-900">Tu Tienda Meraki</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-sm text-gray-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Teléfono de contacto
              </dt>
              <dd className="text-sm font-semibold text-gray-900">3203880422</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-sm text-gray-500">Productos</dt>
              <dd className="text-sm font-semibold text-gray-900">Pantuflas · Maxisacos</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-gray-400">
            Para modificar datos del negocio, contacta al administrador.
          </p>
        </Section>

        {/* Cerrar sesión */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              'flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-red-50 disabled:opacity-60',
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <LogOut className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-red-600">
                  {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </p>
                <p className="text-xs text-gray-400">Salir de la cuenta</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  )
}
