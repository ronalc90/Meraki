'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Printer, X, Type } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getPrintFontSize, setPrintFontSize, PRINT_FONT_LABELS, type PrintFontSize } from '@/lib/preferences';
import { useUser } from '@/lib/UserContext';

type FontSize = PrintFontSize;

const FONT_LABELS = PRINT_FONT_LABELS;

// Font size in pt for print (thermal 58mm paper)
const FONT_SIZES: Record<FontSize, { body: number; bold: number; header: number; footer: number }> = {
  small:  { body: 10, bold: 11, header: 10, footer: 8 },
  medium: { body: 12, bold: 13, header: 11, footer: 9 },
  large:  { body: 14, bold: 15, header: 12, footer: 10 },
};

interface OrderData {
  order_code: string;
  client_name: string;
  phone: string;
  address: string;
  complement: string;
  product_ref: string;
  detail: string;
  value_to_collect: number;
  comment: string;
}

interface DispatchGuideProps {
  order: OrderData;
  onClose: () => void;
}

/**
 * Before printing, add class `printing-active` to <html> and mark the
 * currently visible guide with data-print-root="1". CSS uses these to
 * isolate ONLY this guide, preventing duplicate prints when other
 * print-area elements exist elsewhere in the DOM (e.g. assistant guide modal).
 */
function printGuide(rootId: string) {
  const root = document.getElementById(rootId);
  if (!root) return;
  // Mark this as the only print target
  document.documentElement.classList.add('printing-active');
  root.setAttribute('data-print-root', '1');
  // Print
  window.print();
  // Cleanup after print dialog closes
  setTimeout(() => {
    document.documentElement.classList.remove('printing-active');
    root.removeAttribute('data-print-root');
  }, 500);
}

export default function DispatchGuide({ order, onClose }: DispatchGuideProps) {
  const owner = useUser();
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');
  const rootId = `dispatch-guide-${order.order_code || 'x'}`;

  // Load persisted preference on mount
  useEffect(() => {
    setFontSizeState(getPrintFontSize(owner));
  }, [owner]);

  function handleFontSizeChange(size: FontSize) {
    setFontSizeState(size);
    setPrintFontSize(owner, size);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('printing-active');
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Guide preview — this is the ONLY print root when printing */}
        <div id={rootId} className="print-guide-root" data-font-size={fontSize}>
          <GuideCard order={order} fontSize={fontSize} />
        </div>

        {/* Font size selector */}
        <div className="px-4 pt-3 pb-1 print:hidden">
          <div className="flex items-center gap-2 mb-1.5">
            <Type className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Tamaño de letra</span>
          </div>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {(Object.keys(FONT_LABELS) as FontSize[]).map((size) => (
              <button
                key={size}
                onClick={() => handleFontSizeChange(size)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  fontSize === size
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {FONT_LABELS[size]}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons — hidden when printing */}
        <div className="flex gap-3 px-4 py-3 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4 inline mr-1" />
            Cerrar
          </button>
          <button
            onClick={() => printGuide(rootId)}
            className="flex-[2] rounded-xl py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9061f9 100%)' }}
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

/** Reusable guide card. `fontSize` only affects print (via CSS); screen preview always uses small readable size. */
export function GuideCard({ order, fontSize = 'medium' }: { order: OrderData; fontSize?: FontSize }) {
  const sizes = FONT_SIZES[fontSize];

  return (
    <div
      className="border-2 border-black guide-card mx-auto"
      style={{
        // Expose font sizes as CSS variables for print stylesheet
        ['--guide-body' as string]: `${sizes.body}pt`,
        ['--guide-bold' as string]: `${sizes.bold}pt`,
        ['--guide-header' as string]: `${sizes.header}pt`,
        ['--guide-footer' as string]: `${sizes.footer}pt`,
        maxWidth: '220px',
      }}
    >
      {/* Header */}
      <div className="bg-black flex items-center justify-center gap-2 px-3 py-2 guide-card-header">
        <Image
          src="/logo-meraki.svg"
          alt="Meraki"
          width={50}
          height={34}
          className="invert"
          style={{ filter: 'invert(1)' }}
        />
        <div className="text-white text-center">
          <p className="font-bold text-xs leading-tight">Tu Tienda</p>
          <p className="font-bold text-xs leading-tight">Meraki</p>
        </div>
      </div>

      <div className="border-b-2 border-black" />

      {/* Body — stacked rows, each with word-wrap */}
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
      <div className="border-t-2 border-black py-1 text-center guide-card-footer">
        <p className="text-[10px] font-semibold text-gray-700 leading-tight">Mayor Información</p>
        <p className="text-[10px] font-bold text-gray-900">3203880422.</p>
      </div>
    </div>
  );
}

function GuideRow({ value, bold }: { value: string | number; bold?: boolean }) {
  const display = value === 0 ? '$0' : value;
  if (!display) return null;
  return (
    <div className="border-b border-gray-300 px-2 py-1 guide-row">
      <p
        className={`text-xs ${bold ? 'font-bold text-black' : 'text-gray-900'}`}
        style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
      >
        {String(display)}
      </p>
    </div>
  );
}
