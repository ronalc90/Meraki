'use client';

import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShippingState {
  supported: boolean;
  cryptoConfigured?: boolean;
  carrier: string | null;
  enabled: boolean;
  hasCredentials: boolean;
  carriers?: readonly string[];
}

const CARRIER_LABELS: Record<string, string> = {
  interrapidisimo: 'Interrapidísimo (real)',
  sandbox: 'Sandbox (pruebas)',
};

/**
 * Configuración de transportadora del negocio (Fase E). Solo admin. Guarda el
 * carrier elegido y, para el real (Interrapidísimo), las credenciales, que se
 * cifran en el servidor. El flujo de despacho crea la guía con esta config; sin
 * credenciales, opera el sandbox verificable.
 */
export default function ShippingConfigCard() {
  const [state, setState] = useState<ShippingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [carrier, setCarrier] = useState('sandbox');
  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/shipping', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: ShippingState) => {
        if (!active) return;
        setState(d);
        if (d.carrier) setCarrier(d.carrier);
        setEnabled(!!d.enabled);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return null;
  if (!state?.supported) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900"><Truck className="h-4 w-4" /> Transportadora</h2>
        <p className="mt-1 text-xs text-amber-600">Disponible al aplicar la migración 018 en la base de datos.</p>
      </div>
    );
  }

  const carriers = state.carriers ?? ['sandbox', 'interrapidisimo'];

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { carrier, enabled };
      if (carrier === 'interrapidisimo' && (baseUrl || token)) {
        body.credentials = { baseUrl, token };
      }
      const res = await fetch('/api/admin/shipping', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar');
      toast.success('Transportadora guardada');
      setState((s) => (s ? { ...s, carrier, enabled, hasCredentials: data?.hasCredentials ?? s.hasCredentials } : s));
      setBaseUrl(''); setToken('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900"><Truck className="h-4 w-4" /> Transportadora</h2>
      <p className="text-xs text-gray-500">
        Al despachar un pedido se genera la guía con esta transportadora y se guarda el número de seguimiento.
        Sin credenciales reales, opera el modo de pruebas (sandbox), que recorre todo el flujo hasta &quot;Entregado&quot;.
      </p>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Transportadora</label>
        <select value={carrier} onChange={(e) => setCarrier(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400">
          {carriers.map((c) => <option key={c} value={c}>{CARRIER_LABELS[c] ?? c}</option>)}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Activar creación automática de guías al despachar
      </label>

      {carrier === 'interrapidisimo' && (
        <div className="space-y-2 rounded-xl bg-gray-50 p-3">
          <p className="text-[11px] text-gray-500">
            Credenciales de Interrapidísimo (se guardan cifradas). {state.hasCredentials ? '✓ Ya hay credenciales cargadas.' : 'Aún sin credenciales.'}
            {state.cryptoConfigured === false && <span className="block text-amber-600">Falta definir SHIPPING_ENC_KEY en el servidor para poder cifrarlas.</span>}
          </p>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="API base URL (https://…)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="API token" type="password"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
        </div>
      )}

      <button onClick={save} disabled={saving}
        className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
        {saving ? 'Guardando…' : 'Guardar transportadora'}
      </button>
    </div>
  );
}
