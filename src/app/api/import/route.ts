import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import ExcelJS from 'exceljs';

// Column mappings: Excel header → database field
const ORDER_COLUMNS: Record<string, string> = {
  'CLIENTE': 'client_name',
  'CELULAR': 'phone',
  'CIUDAD': 'city',
  'DIRECCION': 'address',
  'COMPLEMENTO': 'complement',
  'REF': 'product_ref',
  'DETALLE': 'detail',
  'COMENTARIO': 'comment',
  'VALOR A COBRAR': 'value_to_collect',
  'VENDEDOR': 'vendor',
  'DIA PEDIDO': 'order_date',
  'DIA DESPACHO': 'dispatch_date',
  'GUIA': 'guide_number',
  'ESTADO': 'delivery_status',
  'PAGO ANTICIPADO': 'prepaid_amount',
  'GASTOS OP': 'operating_cost',
  'COSTO PRODUCTO': 'product_cost',
  'EFECTIVO BOGO': 'payment_cash_bogo',
  'CAJA': 'payment_cash',
  'TRANSFERENCIA': 'payment_transfer',
  'ES CAMBIO?': 'is_exchange',
  'ID': 'order_code',
};

const INVENTORY_COLUMNS: Record<string, string> = {
  'CANASTA': 'basket_location',
  'ID PRODUCTO': 'product_id',
  'CATEGORÍA': 'category',
  'CATEGORIA': 'category',
  'TIPO': 'type',
  'REFERENCIA': 'reference',
  'MODELO': 'model',
  'COLOR': 'color',
  'TALLA': 'size',
  'CANTIDAD': 'quantity',
  'ESTADO': 'status',
  'OBSERVACIONES': 'observations',
};

const PRODUCT_COLUMNS: Record<string, string> = {
  'ID': 'code',
  'CODIGO': 'code',
  'CÓDIGO': 'code',
  'DETALLE': 'name',
  'NOMBRE': 'name',
  'COSTO': 'cost',
  'CATEGORÍA': 'category',
  'CATEGORIA': 'category',
  'ESTADO': 'active',
};

function cleanCurrency(val: unknown): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseInt(String(val).replace(/[$.,\s]/g, '')) || 0;
}

function cleanString(val: unknown): string {
  if (!val) return '';
  return String(val).trim();
}

function detectType(headers: string[]): 'orders' | 'inventory' | 'products' | null {
  const upper = headers.map(h => h.toUpperCase().trim());
  if (upper.includes('CLIENTE') && (upper.includes('VALOR A COBRAR') || upper.includes('ESTADO'))) return 'orders';
  if (upper.includes('MODELO') && (upper.includes('CANASTA') || upper.includes('CANTIDAD'))) return 'inventory';
  if (upper.includes('COSTO') && (upper.includes('DETALLE') || upper.includes('NOMBRE'))) return 'products';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const forceType = formData.get('type') as string | null;
    const owner = formData.get('owner') as string || 'Paola';

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer as ArrayBuffer);

    const supabase = getServiceClient();
    const results: { type: string; inserted: number; errors: string[] }[] = [];

    for (const sheet of workbook.worksheets) {
      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cleanString(cell.value).toUpperCase();
      });

      const type = forceType || detectType(headers);
      if (!type) continue;

      const columnMap = type === 'orders' ? ORDER_COLUMNS : type === 'inventory' ? INVENTORY_COLUMNS : PRODUCT_COLUMNS;

      // Map header positions to db fields
      const fieldMap: Record<number, string> = {};
      headers.forEach((header, colIdx) => {
        const dbField = columnMap[header];
        if (dbField) fieldMap[colIdx] = dbField;
      });

      if (Object.keys(fieldMap).length === 0) continue;

      const rows: Record<string, unknown>[] = [];
      const errors: string[] = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const record: Record<string, unknown> = { owner };
        let hasData = false;

        for (const [colIdx, dbField] of Object.entries(fieldMap)) {
          const cell = row.getCell(parseInt(colIdx));
          const val = cell.value;

          if (val !== null && val !== undefined && val !== '') hasData = true;

          // Type-specific transformations
          if (['value_to_collect', 'payment_cash_bogo', 'payment_cash', 'payment_transfer',
               'product_cost', 'operating_cost', 'prepaid_amount', 'cost', 'reference', 'quantity'].includes(dbField)) {
            record[dbField] = cleanCurrency(val);
          } else if (dbField === 'is_exchange') {
            const s = cleanString(val).toLowerCase();
            record[dbField] = s === 'si' || s === 'sí' || s === 'true' || s === '1';
          } else if (dbField === 'active') {
            const s = cleanString(val).toLowerCase();
            record[dbField] = s !== 'inactivo' && s !== 'false' && s !== '0';
          } else if (dbField === 'order_date' || dbField === 'dispatch_date') {
            if (val instanceof Date) {
              record[dbField] = val.toISOString().slice(0, 10);
            } else if (val) {
              record[dbField] = cleanString(val);
            }
          } else {
            record[dbField] = cleanString(val);
          }
        }

        if (!hasData) return;

        // Defaults
        if (type === 'orders') {
          if (!record.delivery_status) record.delivery_status = 'Confirmado';
          if (!record.order_date) record.order_date = new Date().toISOString().slice(0, 10);
          if (!record.vendor) record.vendor = owner;
          if (!record.client_name) {
            errors.push(`Fila ${rowNumber}: falta nombre del cliente`);
            return;
          }
        }
        if (type === 'inventory') {
          if (!record.status) record.status = 'Bueno';
          if (!record.quantity) record.quantity = 1;
          if (!record.model) {
            errors.push(`Fila ${rowNumber}: falta modelo`);
            return;
          }
        }
        if (type === 'products') {
          if (!record.active) record.active = true;
          if (!record.code && !record.name) {
            errors.push(`Fila ${rowNumber}: falta código o nombre`);
            return;
          }
        }

        rows.push(record);
      });

      if (rows.length > 0) {
        const table = type === 'orders' ? 'orders' : type === 'inventory' ? 'inventory' : 'products';
        // Insert in batches of 50
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50);
          const { error } = await supabase.from(table).insert(batch);
          if (error) {
            errors.push(`Error BD en lote ${Math.floor(i/50)+1}: ${error.message}`);
          }
        }
      }

      results.push({
        type: type,
        inserted: rows.length - errors.filter(e => e.startsWith('Error BD')).length,
        errors,
      });
    }

    if (results.length === 0) {
      return NextResponse.json({
        error: 'No se reconoció el formato del Excel. Asegúrate de que las columnas coincidan con el formato de exportación.',
      }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error procesando archivo';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
