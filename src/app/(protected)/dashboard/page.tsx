'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShoppingBag,
  Banknote,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/lib/types'
import { cn, formatCurrency } from '@/lib/utils'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const STATUS_STYLES: Record<Order['delivery_status'], { label: string; cls: string }> = {
  Confirmado: { label: 'Confirmado', cls: 'bg-blue-100 text-blue-700' },
  Entregado:  { label: 'Entregado',  cls: 'bg-emerald-100 text-emerald-700' },
  Devolucion: { label: 'Devolución', cls: 'bg-amber-100 text-amber-700' },
  Cancelado:  { label: 'Cancelado',  cls: 'bg-red-100 text-red-700' },
}

interface KPICardProps {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  sub?: React.ReactNode
  highlight?: boolean
}

function KPICard({ label, value, icon, color, sub, highlight }: KPICardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4 shadow-sm border',
        highlight
          ? 'border-purple-200 bg-purple-50'
          : 'border-gray-100 bg-white'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p
            className={cn('text-2xl font-black mt-0.5', highlight && 'text-3xl')}
            style={{ color: highlight ? '#7c3aed' : color }}
          >
            {value}
          </p>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: color }}
        >
          {icon}
        </div>
      </div>
      {sub && <div className="mt-2">{sub}</div>}
    </div>
  )
}

interface SubBreakdownProps {
  items: { label: string; value: string; color: string }[]
}

function SubBreakdown({ items }: SubBreakdownProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="text-xs text-gray-500">
          {item.label}: <strong style={{ color: item.color }}>{item.value}</strong>
        </span>
      ))}
    </div>
  )
}

function VendorCard({ name, count, color }: { name: string; count: number; color: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold"
        style={{ background: color }}
      >
        <User className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{name}</p>
        <p className="text-xl font-bold text-gray-900">{count} <span className="text-sm font-normal text-gray-500">pedidos</span></p>
      </div>
    </div>
  )
}

interface ChartDatum {
  day: string
  revenue: number
}

export default function DashboardPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrders = useCallback(async (y: number, m: number) => {
    setLoading(true)
    try {
      const from = `${y}-${String(m).padStart(2, '0')}-01`
      const daysInMonth = new Date(y, m, 0).getDate()
      const to = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('order_date', from)
        .lte('order_date', to)
        .order('order_date', { ascending: false })
      if (error) throw error
      setOrders(data ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders(year, month)
  }, [year, month, loadOrders])

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  // KPI calculations
  const delivered = orders.filter((o) => o.delivery_status === 'Entregado')
  const confirmed = orders.filter((o) => o.delivery_status === 'Confirmado')
  const returns   = orders.filter((o) => o.delivery_status === 'Devolucion')
  const cancelled = orders.filter((o) => o.delivery_status === 'Cancelado')

  const revenueBogo     = delivered.reduce((s, o) => s + o.payment_cash_bogo, 0)
  const revenueCash     = delivered.reduce((s, o) => s + o.payment_cash, 0)
  const revenueTransfer = delivered.reduce((s, o) => s + o.payment_transfer, 0)
  const totalRevenue    = delivered.reduce((s, o) => s + o.value_to_collect, 0)

  const totalCosts    = delivered.reduce((s, o) => s + o.product_cost, 0)
  const totalOpCosts  = delivered.reduce((s, o) => s + o.operating_cost, 0)
  const totalExpenses = totalCosts + totalOpCosts

  const profit = totalRevenue - totalExpenses

  const ordersGinna   = orders.filter((o) => o.vendor?.toLowerCase().includes('ginna')).length
  const ordersDiana   = orders.filter((o) => o.vendor?.toLowerCase().includes('diana')).length
  const ordersChiquis = orders.filter((o) => o.vendor?.toLowerCase().includes('chiquis')).length

  // Chart data: revenue per day
  const daysInMonth = new Date(year, month, 0).getDate()
  const chartData: ChartDatum[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${day}`
    const dayRevenue = delivered
      .filter((o) => o.order_date === dateStr)
      .reduce((s, o) => s + o.value_to_collect, 0)
    return { day: String(i + 1), revenue: dayRevenue }
  })

  // Recent orders
  const recentOrders = orders.slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-500">Tu Tienda Meraki</p>
          </div>
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-gray-900">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 space-y-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: '#7c3aed', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard
                label="Total Pedidos"
                value={String(orders.length)}
                icon={<ShoppingBag className="h-5 w-5" />}
                color="#3b82f6"
                sub={
                  <SubBreakdown items={[
                    { label: 'Entregados', value: String(delivered.length), color: '#10b981' },
                    { label: 'Devoluciones', value: String(returns.length), color: '#f59e0b' },
                    { label: 'Cancelados', value: String(cancelled.length), color: '#ef4444' },
                  ]} />
                }
              />
              <KPICard
                label="Recaudo Total"
                value={formatCurrency(totalRevenue)}
                icon={<Banknote className="h-5 w-5" />}
                color="#0ea5e9"
                sub={
                  <SubBreakdown items={[
                    { label: 'Bogo', value: formatCurrency(revenueBogo), color: '#3b82f6' },
                    { label: 'Caja', value: formatCurrency(revenueCash), color: '#10b981' },
                    { label: 'Transfer', value: formatCurrency(revenueTransfer), color: '#8b5cf6' },
                  ]} />
                }
              />
              <KPICard
                label="Costos + Gastos Op."
                value={formatCurrency(totalExpenses)}
                icon={<AlertCircle className="h-5 w-5" />}
                color="#f59e0b"
                sub={
                  <SubBreakdown items={[
                    { label: 'Costos', value: formatCurrency(totalCosts), color: '#f59e0b' },
                    { label: 'Op.', value: formatCurrency(totalOpCosts), color: '#ef4444' },
                  ]} />
                }
              />
              <KPICard
                label="Utilidad"
                value={formatCurrency(profit)}
                icon={<TrendingUp className="h-5 w-5" />}
                color={profit >= 0 ? '#10b981' : '#ef4444'}
                highlight
              />
            </div>

            {/* Vendor cards */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Vendedoras</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <VendorCard name="Ginna" count={ordersGinna} color="#7c3aed" />
                <VendorCard name="Diana" count={ordersDiana} color="#f59e0b" />
                <VendorCard name="Chiquis" count={ordersChiquis} color="#10b981" />
              </div>
            </div>

            {/* Daily revenue chart */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Recaudo por día</h2>
              {chartData.some((d) => d.revenue > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                      width={45}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Recaudo']}
                      labelFormatter={(label) => `Día ${label}`}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                  Sin datos de recaudo para este mes
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Últimos pedidos</h2>
              </div>
              {recentOrders.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                  No hay pedidos este mes
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentOrders.map((order) => {
                    const s = STATUS_STYLES[order.delivery_status]
                    return (
                      <div key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm truncate">{order.client_name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            #{order.order_code} · {order.order_date} · {order.vendor}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-semibold text-sm text-gray-900">
                            {formatCurrency(order.value_to_collect)}
                          </span>
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', s.cls)}>
                            {s.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
