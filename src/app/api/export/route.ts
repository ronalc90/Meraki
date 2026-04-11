import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getServiceClient } from '@/lib/supabase'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF7C3AED' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1)
  header.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  header.height = 22
}

function autoWidth(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    if (!col.header) return
    let max = String(col.header).length
    if (col.eachCell) {
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? '').length
        if (len > max) max = len
      })
    }
    col.width = Math.min(max + 4, 50)
  })
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? ''
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const date = searchParams.get('date')

  const supabase = getServiceClient()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Meraki'
  workbook.created = new Date()

  try {
    if (type === 'dashboard') {
      if (!month || !year) {
        return NextResponse.json({ error: 'Se requieren month y year' }, { status: 400 })
      }
      const m = parseInt(month, 10)
      const y = parseInt(year, 10)
      const from = `${y}-${String(m).padStart(2, '0')}-01`
      const daysInMonth = new Date(y, m, 0).getDate()
      const to = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .gte('order_date', from)
        .lte('order_date', to)
        .order('order_date', { ascending: true })

      if (error) throw error

      const rows = orders ?? []
      const delivered = rows.filter((o) => o.delivery_status === 'Entregado')
      const returnsOrders = rows.filter((o) => o.delivery_status === 'Devolucion')
      const cancelledOrders = rows.filter((o) => o.delivery_status === 'Cancelado')

      const totalRevenue = delivered.reduce((s: number, o) => s + (o.value_to_collect ?? 0), 0)
      const totalCosts = delivered.reduce((s: number, o) => s + (o.product_cost ?? 0), 0)
      const totalOpCosts = delivered.reduce((s: number, o) => s + (o.operating_cost ?? 0), 0)
      const profit = totalRevenue - totalCosts - totalOpCosts

      // Sheet 1: Resumen
      const summarySheet = workbook.addWorksheet('Resumen')
      summarySheet.columns = [
        { header: 'Indicador', key: 'indicator', width: 30 },
        { header: 'Valor', key: 'value', width: 25 },
      ]
      styleHeader(summarySheet)

      const kpis = [
        { indicator: 'Total Pedidos', value: rows.length },
        { indicator: 'Entregados', value: delivered.length },
        { indicator: 'Devoluciones', value: returnsOrders.length },
        { indicator: 'Cancelados', value: cancelledOrders.length },
        { indicator: 'Recaudo Total', value: formatCOP(totalRevenue) },
        { indicator: 'Costos', value: formatCOP(totalCosts) },
        { indicator: 'Gastos Operativos', value: formatCOP(totalOpCosts) },
        { indicator: 'Utilidad', value: formatCOP(profit) },
      ]
      kpis.forEach((k) => summarySheet.addRow(k))

      // Sheet 2: Pedidos
      const ordersSheet = workbook.addWorksheet('Pedidos')
      ordersSheet.columns = [
        { header: 'Código', key: 'order_code' },
        { header: 'Cliente', key: 'client_name' },
        { header: 'Teléfono', key: 'phone' },
        { header: 'Ciudad', key: 'city' },
        { header: 'Dirección', key: 'address' },
        { header: 'Complemento', key: 'complement' },
        { header: 'Detalle', key: 'detail' },
        { header: 'Valor', key: 'value_to_collect' },
        { header: 'Estado', key: 'delivery_status' },
        { header: 'Fecha', key: 'order_date' },
      ]
      styleHeader(ordersSheet)
      rows.forEach((o) => {
        ordersSheet.addRow({
          order_code: o.order_code,
          client_name: o.client_name,
          phone: o.phone,
          city: o.city,
          address: o.address,
          complement: o.complement,
          detail: o.detail,
          value_to_collect: o.value_to_collect,
          delivery_status: o.delivery_status,
          order_date: o.order_date,
        })
      })
      autoWidth(ordersSheet)

      // Sheet 3: Diario
      const dailySheet = workbook.addWorksheet('Diario')
      dailySheet.columns = [
        { header: 'Día', key: 'day' },
        { header: '# Pedidos', key: 'count' },
        { header: 'Recaudo', key: 'revenue' },
        { header: 'Costos', key: 'costs' },
        { header: 'Utilidad', key: 'profit' },
      ]
      styleHeader(dailySheet)

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const dayDelivered = rows.filter(
          (o) => o.order_date === dateStr && o.delivery_status === 'Entregado'
        )
        const dayAll = rows.filter((o) => o.order_date === dateStr)
        const dayRevenue = dayDelivered.reduce((s: number, o) => s + (o.value_to_collect ?? 0), 0)
        const dayCosts =
          dayDelivered.reduce((s: number, o) => s + (o.product_cost ?? 0), 0) +
          dayDelivered.reduce((s: number, o) => s + (o.operating_cost ?? 0), 0)
        dailySheet.addRow({
          day: d,
          count: dayAll.length,
          revenue: formatCOP(dayRevenue),
          costs: formatCOP(dayCosts),
          profit: formatCOP(dayRevenue - dayCosts),
        })
      }
      autoWidth(dailySheet)
      autoWidth(summarySheet)
    } else if (type === 'orders-daily') {
      if (!date) {
        return NextResponse.json({ error: 'Se requiere date' }, { status: 400 })
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_date', date)
        .order('created_at', { ascending: true })

      if (error) throw error

      const sheet = workbook.addWorksheet('Pedidos')
      sheet.columns = [
        { header: 'Código', key: 'order_code' },
        { header: 'Cliente', key: 'client_name' },
        { header: 'Teléfono', key: 'phone' },
        { header: 'Ciudad', key: 'city' },
        { header: 'Dirección', key: 'address' },
        { header: 'Complemento', key: 'complement' },
        { header: 'Detalle', key: 'detail' },
        { header: 'Valor', key: 'value_to_collect' },
        { header: 'Estado', key: 'delivery_status' },
        { header: 'Fecha', key: 'order_date' },
      ]
      styleHeader(sheet)
      ;(orders ?? []).forEach((o) => {
        sheet.addRow({
          order_code: o.order_code,
          client_name: o.client_name,
          phone: o.phone,
          city: o.city,
          address: o.address,
          complement: o.complement,
          detail: o.detail,
          value_to_collect: o.value_to_collect,
          delivery_status: o.delivery_status,
          order_date: o.order_date,
        })
      })
      autoWidth(sheet)
    } else if (type === 'inventory') {
      const { data: items, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      const sheet = workbook.addWorksheet('Inventario')
      sheet.columns = [
        { header: 'Canasta', key: 'basket_location' },
        { header: 'ID Producto', key: 'product_id' },
        { header: 'Categoría', key: 'category' },
        { header: 'Tipo', key: 'type' },
        { header: 'Referencia', key: 'reference' },
        { header: 'Modelo', key: 'model' },
        { header: 'Color', key: 'color' },
        { header: 'Talla', key: 'size' },
        { header: 'Cantidad', key: 'quantity' },
        { header: 'Estado', key: 'status' },
      ]
      styleHeader(sheet)
      ;(items ?? []).forEach((i) => {
        sheet.addRow({
          basket_location: i.basket_location,
          product_id: i.product_id,
          category: i.category,
          type: i.type,
          reference: i.reference,
          model: i.model,
          color: i.color,
          size: i.size,
          quantity: i.quantity,
          status: i.status,
        })
      })
      autoWidth(sheet)
    } else if (type === 'products') {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      const sheet = workbook.addWorksheet('Productos')
      sheet.columns = [
        { header: 'Código', key: 'code' },
        { header: 'Nombre', key: 'name' },
        { header: 'Costo', key: 'cost' },
        { header: 'Categoría', key: 'category' },
        { header: 'Estado', key: 'active' },
      ]
      styleHeader(sheet)
      ;(products ?? []).forEach((p) => {
        sheet.addRow({
          code: p.code,
          name: p.name,
          cost: p.cost,
          category: p.category,
          active: p.active ? 'Activo' : 'Inactivo',
        })
      })
      autoWidth(sheet)
    } else {
      return NextResponse.json({ error: 'Tipo de exportación no válido' }, { status: 400 })
    }

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="meraki-${type}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    })
  } catch (err) {
    console.error('[export]', err)
    return NextResponse.json({ error: 'Error al generar el archivo' }, { status: 500 })
  }
}
