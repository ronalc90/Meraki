'use client'

import { useState, useEffect } from 'react'
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
  Key,
  Loader2,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

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

  // OpenAI API Key state
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null)
  const [apiKeyExists, setApiKeyExists] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [loadingKey, setLoadingKey] = useState(true)

  useEffect(() => {
    async function fetchApiKey() {
      try {
        const res = await fetch('/api/settings?key=openai_api_key')
        if (!res.ok) throw new Error('Error al cargar la clave')
        const data = await res.json()
        setApiKeyExists(data.exists ?? false)
        setApiKeyMasked(data.value ?? null)
      } catch {
        // silently ignore — key just shows as not configured
      } finally {
        setLoadingKey(false)
      }
    }
    fetchApiKey()
  }, [])

  async function handleSaveApiKey() {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) {
      toast.error('Ingresa una API key válida')
      return
    }
    setSavingKey(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'openai_api_key', value: trimmed }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al guardar')
      }
      setApiKeyExists(true)
      setApiKeyMasked(`sk-...${trimmed.slice(-4)}`)
      setApiKeyInput('')
      toast.success('API key guardada correctamente')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(msg)
    } finally {
      setSavingKey(false)
    }
  }

  async function handleTestApiKey() {
    setTestingKey(true)
    try {
      const res = await fetch('/api/ai/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' }),
      })
      const data = await res.json()
      if (!res.ok && data.error?.toLowerCase().includes('api key')) {
        throw new Error(data.error)
      }
      // Any response that isn't an auth error means the key works
      toast.success('Conexión con OpenAI exitosa')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con OpenAI'
      toast.error(msg)
    } finally {
      setTestingKey(false)
    }
  }

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
          {/* Status row */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-900">OpenAI API Key</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Requerida para el asistente de pedidos con IA
              </p>
            </div>
            {loadingKey ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : apiKeyExists ? (
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

          {/* Current masked value */}
          {apiKeyExists && apiKeyMasked && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-gray-500 font-mono">
              <Key className="h-3.5 w-3.5 shrink-0" />
              {apiKeyMasked}
            </p>
          )}

          {/* Input field */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {apiKeyExists ? 'Reemplazar API key' : 'Pegar API key'}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="sk-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showApiKey
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={savingKey || !apiKeyInput.trim()}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50',
                )}
                style={{ background: '#7c3aed' }}
              >
                {savingKey
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Key className="h-4 w-4" />}
                Guardar
              </button>

              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={testingKey || (!apiKeyExists && !apiKeyInput.trim())}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-purple-200 py-2.5 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-50',
                )}
              >
                {testingKey
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Zap className="h-4 w-4" />}
                Probar Conexión
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            La clave se almacena de forma segura. Solo se muestran los últimos 4 caracteres.
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
