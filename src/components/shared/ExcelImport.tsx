'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '@/lib/UserContext';

interface ImportResult {
  type: string;
  inserted: number;
  errors: string[];
}

export default function ExcelImport() {
  const owner = useUser();
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const typeLabels: Record<string, string> = {
    orders: 'Pedidos',
    inventory: 'Inventario',
    products: 'Productos',
  };

  async function handleImport(file: File) {
    setImporting(true);
    setResults(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner', owner);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al importar');
      }

      setResults(data.results);
      const total = data.results.reduce((s: number, r: ImportResult) => s + r.inserted, 0);
      toast.success(`${total} registro(s) importados`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <label
        className={`flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
          importing
            ? 'border-purple-300 bg-purple-50'
            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled={importing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
          }}
        />
        {importing ? (
          <>
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-sm text-purple-600 font-medium">Importando {fileName}...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Selecciona un archivo Excel</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx o .xls — El sistema detecta automáticamente el tipo</p>
            </div>
          </>
        )}
      </label>

      {/* Supported formats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: '📦', label: 'Pedidos', desc: 'CLIENTE, CELULAR, DIRECCIÓN...' },
          { icon: '📋', label: 'Inventario', desc: 'MODELO, CANASTA, CANTIDAD...' },
          { icon: '🏷️', label: 'Productos', desc: 'CÓDIGO, DETALLE, COSTO...' },
        ].map((f) => (
          <div key={f.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
            <span className="text-lg">{f.icon}</span>
            <p className="text-xs font-semibold text-gray-700 mt-1">{f.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl p-4 ${
                r.errors.length === 0
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {r.errors.length === 0 ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
                <span className="text-sm font-semibold text-gray-800">
                  <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />
                  {typeLabels[r.type] || r.type}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {r.inserted} importado(s)
                </span>
              </div>
              {r.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {r.errors.slice(0, 5).map((err, j) => (
                    <p key={j} className="text-xs text-amber-700 flex items-start gap-1">
                      <X className="w-3 h-3 mt-0.5 shrink-0" /> {err}
                    </p>
                  ))}
                  {r.errors.length > 5 && (
                    <p className="text-xs text-amber-500">...y {r.errors.length - 5} más</p>
                  )}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => { setResults(null); setFileName(''); }}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Importar otro archivo
          </button>
        </div>
      )}
    </div>
  );
}
