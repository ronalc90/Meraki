export interface Product {
  id: number;
  code: string;
  name: string;
  cost: number;
  category: string;
  active: boolean;
  image_url?: string;
  created_at: string;
}

export type PaymentTiming = 'Anticipado' | 'ContraEntrega' | 'Mixto' | 'Otro' | '';

export const PAYMENT_TIMING_OPTIONS: Array<{ value: Exclude<PaymentTiming, ''>; label: string; short: string }> = [
  { value: 'ContraEntrega', label: 'Contra entrega', short: 'Contra entrega' },
  { value: 'Anticipado', label: 'Pago anticipado (ya pagó)', short: 'Anticipado' },
  { value: 'Mixto', label: 'Mixto (abono + saldo contra entrega)', short: 'Mixto' },
  { value: 'Otro', label: 'Otro (crédito, especie, canje…)', short: 'Otro' },
];

export interface Order {
  id: number;
  order_code: string;
  client_name: string;
  phone: string;
  city: string;
  address: string;
  complement: string;
  product_ref: string;
  detail: string;
  comment: string;
  value_to_collect: number;
  payment_cash_bogo: number;
  payment_cash: number;
  payment_transfer: number;
  product_cost: number;
  delivery_type: 'Bogo' | 'Bodega' | 'Otros' | '';
  vendor: string;
  delivery_status: 'Confirmado' | 'Enviado' | 'Entregado' | 'Pagado' | 'Devolucion' | 'Cancelado';
  status_complement: string;
  is_exchange: boolean;
  order_date: string;
  dispatch_date: string | null;
  guide_number: string;
  prepaid_amount: number;
  operating_cost: number;
  /** Momento del pago (v1.010). Columna opcional en DB: puede ser undefined si la migración no está aplicada. */
  payment_timing?: PaymentTiming;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  basket_location: string;
  product_id: string;
  category: string;
  type: string;
  reference: number;
  model: string;
  color: string;
  size: string;
  quantity: number;
  status: 'Bueno' | 'Malo';
  observations: string;
  verified: boolean;
  image_url?: string;
  created_at: string;
}

export interface DailyKPIs {
  totalOrders: number;
  deliveredBogo: number;
  deliveredBodega: number;
  deliveredOtros: number;
  returns: number;
  exchanges: number;
  cancelled: number;
  revenueBogo: number;
  revenueCash: number;
  revenueTransfer: number;
  totalRevenue: number;
  ordersPaola: number;
  totalCosts: number;
  totalOperatingCosts: number;
  profit: number;
}

export interface ParsedOrder {
  client_name: string;
  phone: string;
  address: string;
  complement: string;
  detail: string;
  value_to_collect: number;
  city?: string;
  product_ref?: string;
  comment?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  parsedOrder?: ParsedOrder;
}
