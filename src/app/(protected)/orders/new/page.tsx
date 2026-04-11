'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, ClipboardList, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { Product, ParsedOrder } from '@/lib/types'
import { generateOrderCode } from '@/lib/utils'
import AIOrderInput from '@/components/orders/AIOrderInput'
import { useUser } from '@/lib/UserContext'
import { isOwnerSupported } from '@/lib/db'

type DeliveryType = 'Bogo' | 'Bodega' | 'Otros' | ''
type DeliveryStatus = 'Confirmado' | 'Entregado' | 'Devolucion' | 'Cancelado'
type Vendor = 'Paola'

interface OrderForm {
  client_name: string
  phone: string
  city: string
  address: string
  complement: string
  product_ref: string
  detail: string
  comment: string
  value_to_collect: string
  payment_cash_bogo: string
  payment_cash: string
  payment_transfer: string
  delivery_type: DeliveryType
  vendor: Vendor
  delivery_status: DeliveryStatus
  order_date: string
  is_exchange: boolean
}

const EMPTY_FORM: OrderForm = {
  client_name: '',
  phone: '',
  city: '',
  address: '',
  complement: '',
  product_ref: '',
  detail: '',
  comment: '',
  value_to_collect: '',
  payment_cash_bogo: '',
  payment_cash: '',
  payment_transfer: '',
  delivery_type: '',
  vendor: 'Paola',
  delivery_status: 'Confirmado',
  order_date: '',
  is_exchange: false,
}

function todayString() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function SupabaseBanner() {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <span>
        Supabase no está configurado. El pedido no se podrá guardar hasta que configures las
        variables de entorno.
      </span>
    </div>
  )
}

interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:opacity-60'

const selectCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:opacity-60'

export default function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const owner = useUser()
  const sp = use(searchParams)
  const router = useRouter()

  const [tab, setTab] = useState<'ai' | 'manual'>('manual')
  const [products, setProducts] = useState<Product[]>([])
  const [supabaseOk, setSupabaseOk] = useState(true)
  const [saving, setSaving] = useState(false)

  const prefillDate = typeof sp.date === 'string' ? sp.date : todayString()

  const [form, setForm] = useState<OrderForm>({
    ...EMPTY_FORM,
    order_date: prefillDate,
  })

  function setField<K extends keyof OrderForm>(key: K, value: OrderForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  useEffect(() => {
    async function loadProducts() {
      try {
        const hasOwner = await isOwnerSupported()
        let query = supabase.from('products').select('*')
        if (hasOwner) query = query.eq('owner', owner)
        query = query.eq('active', true).order('name')
        const { data, error } = await query

        if (error) throw error
        setProducts(data ?? [])
        setSupabaseOk(true)
      } catch {
        setProducts([])
        setSupabaseOk(false)
      }
    }
    loadProducts()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.client_name.trim()) {
      toast.error('El nombre del cliente es requerido')
      return
    }
    if (!form.order_date) {
      toast.error('La fecha del pedido es requerida')
      return
    }
    if (!form.value_to_collect || isNaN(parseFloat(form.value_to_collect))) {
      toast.error('El valor a cobrar es requerido')
      return
    }

    setSaving(true)
    try {
      // Look up product cost
      const selectedProduct = products.find(
        (p) => p.code === form.product_ref || p.id === parseInt(form.product_ref),
      )
      const product_cost = selectedProduct?.cost ?? 0

      // Count existing orders for the date to generate a sequence number
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_date', form.order_date)

      const sequence = (count ?? 0) + 1
      const orderDate = new Date(form.order_date + 'T00:00:00')
      const order_code = generateOrderCode(orderDate, sequence)

      const hasOwner = await isOwnerSupported()
      const payload: Record<string, unknown> = {
        order_code,
        client_name: form.client_name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        complement: form.complement.trim(),
        product_ref: form.product_ref.trim(),
        detail: form.detail.trim(),
        comment: form.comment.trim(),
        value_to_collect: parseFloat(form.value_to_collect) || 0,
        payment_cash_bogo: parseFloat(form.payment_cash_bogo) || 0,
        payment_cash: parseFloat(form.payment_cash) || 0,
        payment_transfer: parseFloat(form.payment_transfer) || 0,
        product_cost,
        delivery_type: form.delivery_type || '',
        vendor: 'Paola',
        delivery_status: form.delivery_status,
        is_exchange: form.is_exchange,
        order_date: form.order_date,
        operating_cost: 0,
        status_complement: '',
        dispatch_date: null,
        guide_number: '',
        prepaid_amount: 0,
      }
      if (hasOwner) payload.owner = owner

      const { error } = await supabase.from('orders').insert(payload)
      if (error) throw error

      toast.success(`Pedido ${order_code} creado exitosamente`)
      router.push(`/orders/daily/${form.order_date}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el pedido'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="mb-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido</h1>
      </div>

      {!supabaseOk && <SupabaseBanner />}

      {/* Tab toggle */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setTab('ai')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            tab === 'ai'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bot className="h-4 w-4" />
          Con IA
        </button>
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            tab === 'manual'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Manual
        </button>
      </div>

      {/* AI Tab */}
      {tab === 'ai' && (
        <div className="rounded-2xl border border-purple-100 bg-white overflow-hidden shadow-sm">
          <AIOrderInput onOrderConfirmed={async (parsed: ParsedOrder) => {
            setForm(prev => ({
              ...prev,
              client_name: parsed.client_name || prev.client_name,
              phone: parsed.phone || prev.phone,
              address: parsed.address || prev.address,
              complement: parsed.complement || prev.complement,
              detail: parsed.detail || prev.detail,
              comment: parsed.comment || prev.comment,
              value_to_collect: parsed.value_to_collect ? String(parsed.value_to_collect) : prev.value_to_collect,
              city: parsed.city || prev.city,
              product_ref: parsed.product_ref || prev.product_ref,
            }));
            setTab('manual');
            toast.success('Datos cargados en el formulario. Revisa y guarda.');
          }} />
        </div>
      )}

      {/* Manual form */}
      {tab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Cliente */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Datos del Cliente
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del Cliente" required>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="María García"
                  value={form.client_name}
                  onChange={(e) => setField('client_name', e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Teléfono">
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="3001234567"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Ciudad">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Bogotá"
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Dirección">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Cra 15 # 80-25"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Complemento" >
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Apto 301, Torre B"
                  value={form.complement}
                  onChange={(e) => setField('complement', e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>
          </div>

          {/* Section: Producto */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Producto y Detalle
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Referencia de Producto">
                {products.length > 0 ? (
                  <select
                    className={selectCls}
                    value={form.product_ref}
                    onChange={(e) => setField('product_ref', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">— Seleccionar —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="REF-001"
                    value={form.product_ref}
                    onChange={(e) => setField('product_ref', e.target.value)}
                    disabled={saving}
                  />
                )}
              </Field>
              <Field label="Detalle del Pedido">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Pantufla talla M - Rosada x2"
                  value={form.detail}
                  onChange={(e) => setField('detail', e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Comentario">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Nota especial, referencia alternativa..."
                  value={form.comment}
                  onChange={(e) => setField('comment', e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>
          </div>

          {/* Section: Valores */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Valores y Pago
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor a Cobrar (COP)" required>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className={inputCls}
                  placeholder="65000"
                  value={form.value_to_collect}
                  onChange={(e) => setField('value_to_collect', e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Recaudo Bogo (COP)">
                <input
                  type="number"
                  min="0"
                  step="100"
                  className={inputCls}
                  placeholder="0"
                  value={form.payment_cash_bogo}
                  onChange={(e) => setField('payment_cash_bogo', e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Recaudo Caja (COP)">
                <input
                  type="number"
                  min="0"
                  step="100"
                  className={inputCls}
                  placeholder="0"
                  value={form.payment_cash}
                  onChange={(e) => setField('payment_cash', e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Recaudo Transferencia (COP)">
                <input
                  type="number"
                  min="0"
                  step="100"
                  className={inputCls}
                  placeholder="0"
                  value={form.payment_transfer}
                  onChange={(e) => setField('payment_transfer', e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>
          </div>

          {/* Section: Logística */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Logística
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Tipo de Envío">
                <select
                  className={selectCls}
                  value={form.delivery_type}
                  onChange={(e) => setField('delivery_type', e.target.value as DeliveryType)}
                  disabled={saving}
                >
                  <option value="">— Seleccionar —</option>
                  <option value="Bogo">Bogo</option>
                  <option value="Bodega">Bodega</option>
                  <option value="Otros">Otros</option>
                </select>
              </Field>
              <Field label="Estado">
                <select
                  className={selectCls}
                  value={form.delivery_status}
                  onChange={(e) =>
                    setField('delivery_status', e.target.value as DeliveryStatus)
                  }
                  disabled={saving}
                >
                  <option value="Confirmado">Confirmado</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Devolucion">Devolucion</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </Field>
              <Field label="Fecha del Pedido" required>
                <input
                  type="date"
                  className={inputCls}
                  value={form.order_date}
                  onChange={(e) => setField('order_date', e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>

            {/* Exchange toggle */}
            <label className="flex cursor-pointer items-center gap-3 pt-1">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.is_exchange}
                  onChange={(e) => setField('is_exchange', e.target.checked)}
                  disabled={saving}
                />
                <div
                  className="h-6 w-10 rounded-full transition-colors duration-200"
                  style={{ background: form.is_exchange ? '#7c3aed' : '#e2e8f0' }}
                />
                <div
                  className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                  style={{
                    transform: form.is_exchange ? 'translateX(16px)' : 'translateX(0)',
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">Es cambio / devolución</span>
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pb-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9061f9 100%)' }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Guardando...
                </span>
              ) : (
                'Crear Pedido'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
