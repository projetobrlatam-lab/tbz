declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: (request: Request) => Promise<Response> | Response): Promise<void>;
}

declare module "https://esm.sh/@supabase/supabase-js@2.44.1" {
  import { SupabaseClient, createClient as originalCreateClient } from '@supabase/supabase-js';
  export const createClient: typeof originalCreateClient;
  export { SupabaseClient };
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {
  // Edge runtime types are automatically available
}

declare module "jsr:@supabase/supabase-js@2" {
  import { SupabaseClient, createClient as originalCreateClient } from '@supabase/supabase-js';
  export const createClient: typeof originalCreateClient;
  export { SupabaseClient };
}