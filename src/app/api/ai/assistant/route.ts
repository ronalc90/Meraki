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
- SIEMPRE needs_confirmation=true para crear pedido o agregar inventario
- Si falta información crítica, usa action="chat" y pregunta
- Talla: "38" → "38-39", "36" → "36-37", "40" → "40-41"
- Ciudad por defecto: Bogotá
- Producto: "vaquita","vaca" → PANT, "maxisaco","cool" → MAX, "clásica" → PANT
- Sé conciso y amigable en los mensajes`;

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
