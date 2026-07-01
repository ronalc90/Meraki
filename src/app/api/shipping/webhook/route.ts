import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { isOrderShippingSupported, isTenantShippingConfigSupported } from '@/lib/db';
import { getCarrierAdapter, orderStatusForTracking, type TenantShippingConfig } from '@/lib/shipping';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** Comparación de secreto en tiempo constante (evita oráculo de tiempo). */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Webhook de la transportadora: actualiza el estado de un pedido a partir de un
 * número de guía. No hay sesión (lo llama el carrier), así que:
 *   - se exige el secreto `SHIPPING_WEBHOOK_SECRET` (header x-shipping-secret),
 *   - se ubica el pedido por `tracking_number` con el service client y se acota
 *     al tenant dueño de esa guía para construir su adaptador y aplicar la
 *     actualización solo a ESE pedido.
 */
export async function POST(request: NextRequest) {
  // Rate-limit por IP ANTES de tocar la BD (freno de fuerza bruta del secreto).
  const ip = request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim()
    || 'unknown';
  const rl = rateLimit(`ship-webhook:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  }

  const secret = process.env.SHIPPING_WEBHOOK_SECRET;
  const provided = request.headers.get('x-shipping-secret') ?? '';
  if (!secret || !secretMatches(provided, secret)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!(await isOrderShippingSupported())) {
    return NextResponse.json({ received: true, skipped: 'shipping no soportado' });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });

  // Número de guía: aceptamos las claves usuales de los carriers.
  const tracking = String(
    (payload.numeroGuia ?? payload.guia ?? payload.tracking ?? payload.trackingNumber ?? '') as string,
  ).trim();
  if (!tracking) return NextResponse.json({ error: 'Sin número de guía' }, { status: 400 });

  const db = getServiceClient();
  // Búsqueda global por número de guía (el carrier no envía tenant). El índice es
  // (tenant_id, tracking_number), no único global: ante una eventual colisión
  // entre tenants tomamos la más reciente de forma DETERMINISTA (evita el error
  // de maybeSingle con 2 filas). El update posterior se acota por tenant_id del
  // pedido hallado, así que nunca se escribe fuera de ese tenant. Las guías de
  // carriers reales son únicas globalmente; el sandbox no debe recibir webhooks
  // en producción (solo sirve para el flujo verificable de pruebas).
  const { data: matches } = await db
    .from('orders')
    .select('id, tenant_id, tracking_number, delivery_status')
    .eq('tracking_number', tracking)
    .order('id', { ascending: false })
    .limit(1);
  const order = matches?.[0];
  if (!order) return NextResponse.json({ received: true, matched: false });

  let shippingConfig: TenantShippingConfig | null = null;
  if (await isTenantShippingConfigSupported()) {
    const { data: t } = await db.from('tenants').select('shipping_config').eq('id', order.tenant_id).maybeSingle();
    shippingConfig = (t?.shipping_config as TenantShippingConfig | null) ?? null;
  }
  const adapter = getCarrierAdapter(shippingConfig);
  const update = adapter.parseWebhook(payload);
  if (!update) return NextResponse.json({ received: true, parsed: false });

  const patch: Record<string, unknown> = {
    tracking_status: update.status,
    tracking_updated_at: update.updatedAt,
  };
  const mapped = orderStatusForTracking(update.status);
  if (mapped) patch.delivery_status = mapped;

  // Update acotado por id + tenant_id (defensa: solo el pedido de ese tenant).
  await db.from('orders').update(patch).eq('id', order.id).eq('tenant_id', order.tenant_id);
  return NextResponse.json({ received: true, matched: true, status: update.status });
}
