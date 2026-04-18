import { supabase, supabaseConfigured } from './supabase';

let _ownerSupported: boolean | null = null;
let _paymentTimingSupported: boolean | null = null;

export async function isOwnerSupported(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  if (_ownerSupported !== null) return _ownerSupported;
  try {
    const { error } = await supabase.from('products').select('owner').limit(1);
    _ownerSupported = !error;
  } catch {
    _ownerSupported = false;
  }
  return _ownerSupported;
}

export async function isPaymentTimingSupported(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  if (_paymentTimingSupported !== null) return _paymentTimingSupported;
  try {
    const { error } = await supabase.from('orders').select('payment_timing').limit(1);
    _paymentTimingSupported = !error;
  } catch {
    _paymentTimingSupported = false;
  }
  return _paymentTimingSupported;
}

export function resetOwnerCache() {
  _ownerSupported = null;
}

export function resetPaymentTimingCache() {
  _paymentTimingSupported = null;
}
