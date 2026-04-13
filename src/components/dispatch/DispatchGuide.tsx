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
        {/* Guide card — matches Excel template format exactly */}
        <div className="print-area">
          <div className="border-2 border-solid border-gray-800 guide-card" style={{ height: 'auto' }}>
            {/* Header */}
            <div className="text-center py-3 px-4 border-b-2 border-solid border-gray-800 bg-gray-50 guide-card-header">
              <h2 className="font-black text-xl tracking-tight text-gray-900 uppercase">
                Tu Tienda Meraki
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Guía de Envío</p>
            </div>

            {/* Fields */}
            <div className="px-4 py-3 space-y-0 text-sm guide-card-body">
              <GuideRow label="ID Pedido" value={order.order_code} bold />
              <GuideRow label="Cliente" value={order.client_name} semibold />
              <GuideRow label="Celular" value={order.phone} />
              <GuideRow label="Dirección" value={order.address} />
              {order.complement && <GuideRow label="Barrio" value={order.complement} />}
              {order.product_ref && <GuideRow label="Referencia" value={order.product_ref} />}
              <GuideRow label="Detalle" value={order.detail} />
              <div className="flex gap-2 items-center pt-2 mt-1 border-t-2 border-solid border-gray-400 guide-row">
                <span className="w-28 shrink-0 text-xs font-bold text-gray-500 uppercase tracking-wide guide-label">
                  Valor a cobrar
                </span>
                <span className="text-xl font-black text-gray-900 guide-value guide-value-big">
                  {formatCurrency(order.value_to_collect)}
                </span>
              </div>
              {order.comment && <GuideRow label="Comentario" value={order.comment} italic />}
            </div>

            {/* Footer */}
            <div className="py-2 border-t-2 border-solid border-gray-800 text-center bg-gray-50 guide-card-footer">
              <p className="text-xs font-bold text-gray-600">
                Mayor Información 3203880422
              </p>
            </div>
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
            Imprimir Guía
          </button>
        </div>
      </div>
    </div>
  );
}

interface GuideRowProps {
  label: string;
  value: string;
  bold?: boolean;
  semibold?: boolean;
  italic?: boolean;
}

function GuideRow({ label, value, bold, semibold, italic }: GuideRowProps) {
  return (
    <div className="flex gap-2 border-b border-gray-200 py-1.5 guide-row">
      <span className="w-28 shrink-0 text-xs font-bold text-gray-500 uppercase tracking-wide guide-label">
        {label}
      </span>
      <span
        className={`flex-1 text-sm guide-value ${
          bold ? 'font-bold text-gray-900' :
          semibold ? 'font-semibold text-gray-800' :
          italic ? 'text-gray-700 italic' :
          'text-gray-800'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  );
}
