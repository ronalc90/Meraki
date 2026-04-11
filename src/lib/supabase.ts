import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isConfigured = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 0;

// Create a mock client that returns empty results when Supabase is not configured
function createMockClient(): SupabaseClient {
  const mockResponse = { data: [], error: null, count: 0 };
  const mockSingle = { data: null, error: null };

  const chainable: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq',
    'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'in', 'order', 'limit', 'range',
    'single', 'maybeSingle', 'filter', 'match', 'not', 'or', 'contains',
    'containedBy', 'textSearch'];

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'then') return undefined;
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve(mockSingle);
      if (methods.includes(prop)) return () => new Proxy(chainable, handler);
      return () => new Proxy(chainable, handler);
    },
  };

  const fromProxy = new Proxy(chainable, handler);

  return {
    from: () => fromProxy,
    rpc: () => Promise.resolve(mockResponse),
    auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();

export const supabaseConfigured = isConfigured;

export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!isConfigured || !serviceKey) return supabase;
  return createClient(supabaseUrl, serviceKey);
}
