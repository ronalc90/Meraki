import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServiceClient } from '@/lib/supabase';

async function resolveApiKey(): Promise<string | null> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'openai_api_key').maybeSingle();
    if (!error && data?.value?.trim()) return data.value.trim();
  } catch { /* fall through */ }
  return process.env.OPENAI_API_KEY ?? null;
}

const SYSTEM_PROMPT = `Eres el asistente inteligente de "Tu Tienda Meraki", un negocio colombiano de pantuflas, maxisacos y accesorios.

Eres un multi-agente que puede:

1. **CREAR PEDIDO**: Cuando el usuario te da datos de un pedido (nombre, teléfono, dirección, producto, valor)
2. **AGREGAR INVENTARIO**: Cuando dice "tengo X de tal", "llegaron X", "puse X en canasta Y"
3. **BUSCAR INVENTARIO**: Cuando pregunta "dónde está...", "cuántos tengo de...", "hay pantuflas talla 38?"
4. **CONSULTAR PEDIDOS**: Cuando pregunta "cuántos pedidos hoy", "pedidos pendientes", etc.
5. **BUSCAR PRODUCTOS**: Cuando pregunta sobre el catálogo: "qué productos tengo", "cuánto cuesta...", "muestra las pantuflas"
6. **GENERAR REPORTE**: Cuando pide "dame el reporte", "exporta los pedidos", "genera el excel", "informe de hoy"
7. **MARCAR DEFECTUOSO**: Cuando dice "esta pantufla está dañada", "tengo 3 defectuosas", "hay un producto malo"
8. **DEVOLVER PEDIDO**: Cuando dice "me devolvieron el pedido de Carlos", "devolución del pedido #4041301"
9. **REGISTRAR COSTO**: Cuando dice "me llegó mercancía a $X", "las vaquitas me costaron $15.000 cada una", "el costo de las clásicas es $12.000"
10. **CAMBIAR ESTADO DE PEDIDO**: Cuando dice "coloca el pedido de Carlos como entregado", "marca el pedido #4041301 como cancelado", "el pedido de María ya se entregó"
11. **REGISTRAR GASTO**: Cuando dice "gasté $50.000 en envíos", "pagué $30.000 de arriendo", "compré bolsas por $10.000"

Analiza el contexto y decide qué acción tomar. Responde SIEMPRE en JSON:

Para CREAR PEDIDO:
{
  "action": "create_order",
  "data": {
    "client_name": "string",
    "phone": "string",
    "address": "string",
    "complement": "string",
    "detail": "string",
    "value_to_collect": number,
    "city": "string (default Bogotá)",
    "product_ref": "PANT|MAX|POC|BOL o vacío",
    "comment": "string"
  },
  "message": "resumen amigable",
  "needs_confirmation": true
}

Para AGREGAR INVENTARIO:
{
  "action": "add_inventory",
  "data": [{
    "model": "string",
    "category": "Pantuflas|Maxisaco|Pocillo|Bolso|Accesorio",
    "product_id": "string",
    "color": "string",
    "size": "string (formato 36-37, 38-39, 40-41)",
    "quantity": number,
    "basket_location": "string (C001, C002...)",
    "type": "Adulto|Niño",
    "observations": "string"
  }],
  "message": "resumen amigable",
  "needs_confirmation": true
}

Para BUSCAR INVENTARIO (el sistema buscará y te dará resultados):
{
  "action": "search_inventory",
  "search": {
    "model": "string o null",
    "color": "string o null",
    "size": "string o null",
    "category": "string o null"
  },
  "message": "voy a buscar..."
}

Para CONSULTAR PEDIDOS:
{
  "action": "search_orders",
  "search": {
    "date": "YYYY-MM-DD o null (null = hoy)",
    "status": "string o null",
    "client": "string o null"
  },
  "message": "voy a buscar..."
}

Para BUSCAR PRODUCTOS del catálogo:
{
  "action": "search_products",
  "search": {
    "name": "string o null",
    "code": "string o null",
    "category": "Pantuflas|Maxisaco|Pocillo|Bolso|Otro o null"
  },
  "message": "voy a buscar en el catálogo..."
}

Para GENERAR REPORTE / EXPORTAR EXCEL:
{
  "action": "generate_report",
  "report": {
    "type": "dashboard|orders-daily|inventory|products",
    "date": "YYYY-MM-DD o null (para orders-daily)",
    "month": "número 1-12 o null (para dashboard)",
    "year": "número o null (para dashboard)"
  },
  "message": "voy a generar el reporte..."
}

Para MARCAR DEFECTUOSO en inventario:
{
  "action": "mark_defective",
  "data": {
    "model": "string",
    "color": "string o null",
    "size": "string o null",
    "quantity": number,
    "observations": "razón del defecto"
  },
  "message": "resumen amigable",
  "needs_confirmation": true
}

Para DEVOLVER PEDIDO (registrar devolución):
{
  "action": "return_order",
  "data": {
    "order_code": "string (código del pedido, ej: 4041301)",
    "client_name": "string o null (para buscar si no tiene código)",
    "reason": "razón de la devolución"
  },
  "message": "resumen amigable",
  "needs_confirmation": true
}

Para CAMBIAR ESTADO DE PEDIDO:
{
  "action": "update_order_status",
  "data": {
    "order_code": "string o null",
    "client_name": "string o null (busca por nombre si no hay código)",
    "new_status": "Confirmado|Entregado|Devolucion|Cancelado",
    "payment_cash": number o null (monto en efectivo si se entrega),
    "payment_transfer": number o null (monto transferencia si se entrega)
  },
  "message": "resumen amigable",
  "needs_confirmation": true
}

Para REGISTRAR COSTO de mercancía (actualizar precio de costo en inventario):
{
  "action": "update_cost",
  "data": {
    "model": "string (nombre del modelo)",
    "cost": number (costo unitario),
    "color": "string o null",
    "size": "string o null"
  },
  "message": "resumen amigable",
  "needs_confirmation": true
}

Para REGISTRAR GASTO de la tienda:
{
  "action": "register_expense",
  "data": {
    "description": "string (descripción del gasto)",
    "amount": number,
    "category": "envío|arriendo|servicios|materiales|empaque|publicidad|otro"
  },
  "message": "resumen amigable",
  "needs_confirmation": true
}

Para CONVERSACIÓN GENERAL o si falta info:
{
  "action": "chat",
  "message": "tu respuesta amigable pidiendo lo que falta"
}

Para CONFIRMAR una acción pendiente (el usuario dice "sí", "confirmar", "dale"):
{
  "action": "confirm",
  "message": "confirmado"
}

Reglas:
- SIEMPRE needs_confirmation=true para acciones que modifican datos (crear, actualizar, eliminar)
- Si falta información crítica, usa action="chat" y pregunta
- Talla: "38" → "38-39", "36" → "36-37", "40" → "40-41"
- Ciudad por defecto: Bogotá
- Producto: "vaquita","vaca" → PANT, "maxisaco","cool" → MAX, "clásica" → PANT
- Sé conciso y amigable en los mensajes
- Si el usuario es ambiguo pero puedes deducir la intención, hazlo e incluye needs_confirmation=true
- Tienes autoridad TOTAL para modificar pedidos, inventario, estados, costos, etc.
- Cuando el usuario dice "ya se entregó" o "ya llegó" → update_order_status con new_status="Entregado"
- Cuando dice "cancela" → update_order_status con new_status="Cancelado"
- Cuando dice "devolvieron" → return_order
- Cuando dice "dañado", "roto", "defectuoso" → mark_defective
- Si el usuario dice algo que no entiendes, intenta interpretar en contexto de una tienda de pantuflas`;

export async function POST(request: NextRequest) {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada. Ve a Configuración.' }, { status: 500 });
  }

  try {
    const { message, context, owner } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    const supabase = getServiceClient();

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    if (context && Array.isArray(context)) {
      for (const msg of context.slice(-10)) {
        messages.push({ role: msg.role, content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) });
      }
    }
    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return NextResponse.json({ error: 'Sin respuesta' }, { status: 500 });

    const parsed = JSON.parse(content);

    // Handle search actions server-side
    if (parsed.action === 'search_inventory') {
      const s = parsed.search || {};
      let query = supabase.from('inventory').select('*');
      if (owner) query = query.eq('owner', owner);
      if (s.model) query = query.ilike('model', `%${s.model}%`);
      if (s.color) query = query.ilike('color', `%${s.color}%`);
      if (s.size) query = query.ilike('size', `%${s.size}%`);
      if (s.category) query = query.ilike('category', `%${s.category}%`);
      const { data: results } = await query.limit(20);

      if (!results?.length) {
        parsed.message = `No encontré productos con esas características en el inventario.`;
        parsed.results = [];
      } else {
        const summary = results.map(r => `• ${r.model} ${r.color || ''} ${r.size || ''} - Cantidad: ${r.quantity} - Canasta: ${r.basket_location}`).join('\n');
        parsed.message = `Encontré ${results.length} resultado(s):\n${summary}`;
        parsed.results = results;
      }
    }

    if (parsed.action === 'search_products') {
      const s = parsed.search || {};
      let query = supabase.from('products').select('*');
      if (owner) query = query.eq('owner', owner);
      if (s.name) query = query.ilike('name', `%${s.name}%`);
      if (s.code) query = query.ilike('code', `%${s.code}%`);
      if (s.category) query = query.ilike('category', `%${s.category}%`);
      query = query.eq('active', true);
      const { data: results } = await query.order('name').limit(20);

      if (!results?.length) {
        parsed.message = `No encontré productos con esas características en el catálogo.`;
        parsed.results = [];
      } else {
        const summary = results.map(r => `• ${r.code} — ${r.name} (${r.category}) — $${Number(r.cost).toLocaleString('es-CO')}`).join('\n');
        parsed.message = `Encontré ${results.length} producto(s) en el catálogo:\n${summary}`;
        parsed.results = results;
      }
    }

    if (parsed.action === 'search_orders') {
      const s = parsed.search || {};
      const today = new Date().toISOString().slice(0, 10);
      let query = supabase.from('orders').select('*');
      if (owner) query = query.eq('owner', owner);
      query = query.eq('order_date', s.date || today);
      if (s.status) query = query.eq('delivery_status', s.status);
      if (s.client) query = query.ilike('client_name', `%${s.client}%`);
      const { data: results } = await query.order('created_at', { ascending: false }).limit(20);

      if (!results?.length) {
        parsed.message = `No hay pedidos para ${s.date || today}.`;
        parsed.results = [];
      } else {
        const total = results.reduce((s, o) => s + (o.value_to_collect || 0), 0);
        parsed.message = `${results.length} pedido(s) para ${s.date || today}. Total: $${total.toLocaleString('es-CO')}`;
        parsed.results = results;
      }
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
