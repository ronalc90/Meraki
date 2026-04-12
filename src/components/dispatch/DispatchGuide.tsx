'use client';

import { formatCurrency } from '@/lib/utils';

interface DispatchGuideProps {
  order: {
    order_code: string;
    client_name: string;
    phone: string;
    address: string;
    complement: string;
    product_ref: string;
    detail: string;
    value_to_collect: number;
    comment: string;
  };
  onClose: () => void;
}

export default function DispatchGuide({ order, onClose }: DispatchGuideProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Guide card */}
        <div className="print-area border-2 border-gray-800">
          {/* Header */}
          <div className="bg-purple-700 px-5 py-4 text-center">
            <h1 className="text-lg font-bold text-white tracking-wide">Tu Tienda Meraki</h1>
            <p className="text-purple-200 text-xs mt-0.5">Guía de Envío</p>
          </div>

          {/* Fields */}
          <div className="px-5 py-4 space-y-3">
            <GuideRow label="ID Pedido" value={order.order_code} highlight />
            <GuideRow label="Cliente" value={order.client_name} />
            <GuideRow label="Celular" value={order.phone} />
            <GuideRow label="Dirección" value={order.address} />
            {order.complement && (
              <GuideRow label="Complemento" value={order.complement} />
            )}
            {order.product_ref && (
              <GuideRow label="Referencia" value={order.product_ref} />
            )}
            <GuideRow label="Detalle" value={order.detail} />
            <GuideRow
              label="Valor a cobrar"
              value={formatCurrency(order.value_to_collect)}
              highlight
            />
            {order.comment && (
              <GuideRow label="Comentario" value={order.comment} />
            )}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-800 px-5 py-3 text-center">
            <p className="text-xs text-gray-600 font-medium">Mayor Información 3203880422</p>
          </div>
        </div>

        {/* Action buttons — hidden when printing */}
        <div className="flex gap-3 px-5 py-4 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex-[2] rounded-xl py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9061f9 100%)' }}
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

interface GuideRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function GuideRow({ label, value, highlight }: GuideRowProps) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-semibold text-gray-500 w-28 shrink-0 pt-0.5">{label}:</span>
      <span className={`text-sm flex-1 ${highlight ? 'font-bold text-purple-700' : 'text-gray-800'}`}>
        {value || '—'}
      </span>
    </div>
  );
}
