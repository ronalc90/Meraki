'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  ShoppingBag,
  PackageCheck,
  Undo2,
  XCircle,
  Banknote,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/lib/types'
import { cn, formatCurrency, getMonthDays } from '@/lib/utils'
import { useUser } from '@/lib/UserContext'
import { isOwnerSupported } from '@/lib/db'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function SupabaseBanner() {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <span>
        Supabase no está configurado. Configura las variables de entorno para ver los pedidos
        reales.
      </span>
    </div>
  )
}

interface KPICardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}

function KPICard({ label, value, icon, color }: KPICardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="truncate font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function padDate(n: number) {
  return String(n).padStart(2, '0')
}

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const owner = useUser()
  const sp = use(searchParams)
  const router = useRouter()

  const now = new Date()
  const [year, setYear] = useState<number>(() => {
    const y = parseInt(String(sp.year ?? ''))
    return isNaN(y) ? now.getFullYear() : y
  })
  const [month, setMonth] = useState<number>(() => {
    const m = parseInt(String(sp.month ?? ''))
    return isNaN(m) || m < 1 || m > 12 ? now.getMonth() + 1 : m
  })

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [supabaseOk, setSupabaseOk] = useState(true)

  const todayStr = `${now.getFullYear()}-${padDate(now.getMonth() + 1)}-${padDate(now.getDate())}`

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const from = `${year}-${padDate(month)}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const to = `${year}-${padDate(month)}-${padDate(lastDay)}`

      const hasOwner = await isOwnerSupported()
      let query = supabase.from('orders').select('*')
      if (hasOwner) query = query.eq('owner', owner)
      query = query.gte('order_date', from).lte('order_date', to)
      const { data, error } = await query

      if (error) throw error
      setOrders(data ?? [])
      setSupabaseOk(true)
    } catch {
      setOrders([])
      setSupabaseOk(false)
    } finally {
      setLoading(false)
    }
  }, [year, month, owner])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  function prevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  // Group orders by date
  const ordersByDate = orders.reduce<Record<string, Order[]>>((acc, o) => {
    const key = o.order_date.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {})

  // KPI summary
  const totalOrders = orders.length
  const delivered = orders.filter((o) => o.delivery_status === 'Entregado').length
  const returns = orders.filter((o) => o.delivery_status === 'Devolucion').length
  const cancelled = orders.filter((o) => o.delivery_status === 'Cancelado').length
  const totalRevenue = orders
    .filter((o) => o.delivery_status === 'Entregado')
    .reduce((sum, o) => sum + (o.value_to_collect ?? 0), 0)
  const totalCosts = orders.reduce((sum, o) => sum + (o.product_cost ?? 0), 0)
  const profit = totalRevenue - totalCosts

  // Calendar days
  const days = getMonthDays(year, month)
  // Padding for first day of month
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  function navigateToDay(dateStr: string) {
    router.push(`/orders/daily/${dateStr}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-1 py-1 shadow-sm">
            <button
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-gray-700">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => router.push('/orders/new')}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9061f9 100%)' }}
          >
            <Plus className="h-4 w-4" />
            Nuevo Pedido
          </button>
        </div>
      </div>

      {!supabaseOk && <SupabaseBanner />}

      {/* KPI Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard
          label="Total Pedidos"
          value={totalOrders}
          icon={<ShoppingBag className="h-5 w-5" />}
          color="#7c3aed"
        />
        <KPICard
          label="Entregados"
          value={delivered}
          icon={<PackageCheck className="h-5 w-5" />}
          color="#10b981"
        />
        <KPICard
          label="Devoluciones"
          value={returns}
          icon={<Undo2 className="h-5 w-5" />}
          color="#f59e0b"
        />
        <KPICard
          label="Cancelados"
          value={cancelled}
          icon={<XCircle className="h-5 w-5" />}
          color="#ef4444"
        />
        <KPICard
          label="Recaudo"
          value={formatCurrency(totalRevenue)}
          icon={<Banknote className="h-5 w-5" />}
          color="#0ea5e9"
        />
        <KPICard
          label="Utilidad"
          value={formatCurrency(profit)}
          icon={<TrendingUp className="h-5 w-5" />}
          color={profit >= 0 ? '#10b981' : '#ef4444'}
        />
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2"
            style={{ borderColor: '#7c3aed', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES_SHORT.map((d) => (
              <div
                key={d}
                className="py-2.5 text-center text-xs font-semibold text-gray-500"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {/* Empty padding cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`pad-${i}`} className="border-b border-r border-gray-50 min-h-[80px]" />
            ))}

            {days.map((day) => {
              const dateStr = `${year}-${padDate(month)}-${padDate(day.getDate())}`
              const dayOrders = ordersByDate[dateStr] ?? []
              const dayRevenue = dayOrders
                .filter((o) => o.delivery_status === 'Entregado')
                .reduce((sum, o) => sum + (o.value_to_collect ?? 0), 0)
              const isToday = dateStr === todayStr
              const hasOrders = dayOrders.length > 0
              const colIndex = (firstDayOfWeek + day.getDate() - 1) % 7
              const isLastCol = colIndex === 6

              return (
                <button
                  key={dateStr}
                  onClick={() => navigateToDay(dateStr)}
                  className={cn(
                    'relative flex min-h-[80px] flex-col items-start gap-1 border-b p-2 text-left transition-all hover:z-10 hover:shadow-md',
                    isLastCol ? 'border-r-0' : 'border-r',
                    'border-gray-100',
                    isToday && 'bg-purple-50',
                    !isToday && hasOrders && 'hover:bg-emerald-50',
                    !isToday && !hasOrders && 'hover:bg-gray-50',
                  )}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      isToday ? 'text-white' : 'text-gray-700',
                    )}
                    style={isToday ? { background: '#7c3aed' } : {}}
                  >
                    {day.getDate()}
                  </span>

                  {hasOrders && (
                    <>
                      <span className="text-xs font-semibold text-emerald-600">
                        {dayOrders.length} {dayOrders.length === 1 ? 'pedido' : 'pedidos'}
                      </span>
                      {dayRevenue > 0 && (
                        <span className="text-[10px] text-gray-500 leading-tight">
                          {formatCurrency(dayRevenue)}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
