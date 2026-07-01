'use client';

import { useEffect, useMemo, useState } from 'react';
import { QrCode, Copy, Download, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenant } from '@/lib/TenantContext';
import { qrSvg, catalogUrl } from '@/lib/qr';

/**
 * Tarjeta de "Catálogo público" en Ajustes: muestra el enlace del catálogo del
 * tenant, un QR descargable (SVG) y accesos para copiar/abrir. El QR y el enlace
 * llevan a /catalog/[slug] (Fase D).
 */
export default function CatalogQrCard() {
  const { config } = useTenant();
  const [svg, setSvg] = useState('');

  const url = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return config.slug ? catalogUrl(config.slug, origin) : '';
  }, [config.slug]);

  useEffect(() => {
    let active = true;
    if (url) qrSvg(url, { width: 200, margin: 1 }).then((s) => { if (active) setSvg(s); }).catch(() => {});
    return () => { active = false; };
  }, [url]);

  function copy() {
    navigator.clipboard?.writeText(url).then(() => toast.success('Enlace copiado')).catch(() => {});
  }

  function download() {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `catalogo-${config.slug || 'negocio'}.svg`;
    a.click();
    URL.revokeObjectURL(href);
  }

  if (!url) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900"><QrCode className="h-4 w-4" /> Catálogo público</h2>
      <p className="text-xs text-gray-500">
        Comparte tu catálogo en línea con tus clientes. El QR y el enlace llevan a tus productos con foto y precio.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
        {svg && <div className="h-[140px] w-[140px] shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="break-all rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-600">{url}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
            <button onClick={download} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <Download className="h-3.5 w-3.5" /> Descargar QR
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
