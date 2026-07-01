import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getServiceClient } from '@/lib/supabase';
import { isTenantShippingConfigSupported } from '@/lib/db';
import { SUPPORTED_CARRIERS } from '@/lib/shipping';
import { encryptCredentials, isShippingCryptoConfigured } from '@/lib/shipping/crypto';

export const dynamic = 'force-dynamic';

/**
 * Configuración de TRANSPORTADORA por tenant (Fase E). Solo admin de su propio
 * negocio. Las credenciales del carrier se CIFRAN (AES-256-GCM) antes de
 * guardarse en `tenants.shipping_config` y NUNCA se devuelven al cliente: el GET
 * solo dice qué carrier está elegido y si ya hay credenciales cargadas.
 */

interface ShippingConfigRow {
  carrier?: string | null;
  enabled?: boolean;
  credentials?: string | null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!(await isTenantShippingConfigSupported())) {
    return NextResponse.json({ supported: false });
  }
  const db = getServiceClient();
  const { data } = await db.from('tenants').select('shipping_config').eq('id', auth.ctx.tenantId).maybeSingle();
  const cfg = (data?.shipping_config as ShippingConfigRow | null) ?? null;
  return NextResponse.json({
    supported: true,
    cryptoConfigured: isShippingCryptoConfigured(),
    carrier: cfg?.carrier ?? null,
    enabled: !!cfg?.enabled,
    hasCredentials: !!cfg?.credentials,
    carriers: SUPPORTED_CARRIERS,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!(await isTenantShippingConfigSupported())) {
    return NextResponse.json({ error: 'La configuración de transportadora no está disponible (migración 018 pendiente)' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const carrier = typeof body.carrier === 'string' ? body.carrier.toLowerCase() : '';
  if (carrier && !(SUPPORTED_CARRIERS as readonly string[]).includes(carrier)) {
    return NextResponse.json({ error: 'Transportadora no soportada' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: existing } = await db.from('tenants').select('shipping_config').eq('id', auth.ctx.tenantId).maybeSingle();
  const current = (existing?.shipping_config as ShippingConfigRow | null) ?? {};

  const next: ShippingConfigRow = {
    carrier: carrier || current.carrier || null,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : (current.enabled ?? false),
    credentials: current.credentials ?? null,
  };

  // Si envían credenciales nuevas (baseUrl + token del carrier real), las ciframos.
  if (body.credentials && typeof body.credentials === 'object') {
    if (!isShippingCryptoConfigured()) {
      return NextResponse.json({ error: 'Falta SHIPPING_ENC_KEY en el servidor para cifrar las credenciales' }, { status: 409 });
    }
    const { baseUrl, token } = body.credentials as { baseUrl?: string; token?: string };
    if (!baseUrl || !token) {
      return NextResponse.json({ error: 'Se requieren baseUrl y token de la transportadora' }, { status: 400 });
    }
    next.credentials = encryptCredentials({ baseUrl: String(baseUrl), token: String(token) });
  }

  const { error } = await db.from('tenants').update({ shipping_config: next }).eq('id', auth.ctx.tenantId);
  if (error) {
    console.error('admin/shipping PATCH error:', error.message);
    return NextResponse.json({ error: 'No se pudo guardar la configuración' }, { status: 500 });
  }
  return NextResponse.json({ success: true, carrier: next.carrier, enabled: next.enabled, hasCredentials: !!next.credentials });
}
