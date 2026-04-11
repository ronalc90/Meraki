import { supabase, supabaseConfigured } from './supabase';

let _ownerSupported: boolean | null = null;

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

export function resetOwnerCache() {
  _ownerSupported = null;
}
