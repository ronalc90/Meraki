'use client';

import Image from 'next/image';
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Guide card — matching Excel template exactly */}
        <div className="print-area">
          <GuideCard order={order} />
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
            onClick={() => window.print()}
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

/** Reusable guide card — used in DispatchGuide modal AND in PrintView batch */
export function GuideCard({
  order,
}: {
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
}) {
  return (
    <div className="border-2 border-black guide-card">
      {/* Header — black background with logo */}
      <div className="bg-black flex items-center justify-center gap-3 px-4 py-3 guide-card-header">
        <Image
          src="/logo-meraki.svg"
          alt="Meraki"
          width={50}
          height={34}
          className="invert"
          style={{ filter: 'invert(1)' }}
        />
        <div className="text-white text-center">
          <p className="font-bold text-sm leading-tight">Tu Tienda</p>
          <p className="font-bold text-sm leading-tight">Meraki</p>
        </div>
      </div>

      {/* Separator */}
      <div className="border-b-2 border-black" />

      {/* Stacked field rows — each value in its own bordered cell, NO labels */}
      <div className="guide-card-body">
        <GuideRow value={order.order_code} bold />
        <GuideRow value={order.client_name} />
        <GuideRow value={order.phone} />
        <GuideRow value={order.address} />
        <GuideRow value={order.complement} />
        <GuideRow value={order.product_ref} />
        <GuideRow value={order.detail} />
        <GuideRow value={formatCurrency(order.value_to_collect)} bold />
        <GuideRow value={order.comment} />
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black py-2 text-center guide-card-footer">
        <p className="text-xs font-semibold text-gray-700 leading-tight">Mayor Información</p>
        <p className="text-xs font-bold text-gray-900">3203880422.</p>
      </div>
    </div>
  );
}

function GuideRow({ value, bold }: { value: string | number; bold?: boolean }) {
  const display = value === 0 ? '$0' : value;
  if (!display) return null;
  return (
    <div className="border-b border-gray-300 px-3 py-1.5 guide-row">
      <p className={`text-sm ${bold ? 'font-bold text-black' : 'text-gray-900'}`}>
        {String(display)}
      </p>
    </div>
  );
}
