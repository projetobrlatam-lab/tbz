// Fallback type definition for Deno
// This is used to silence IDE errors when the Deno extension is not active.
// Real Deno types are injected by the runtime.

declare const Deno: {
    env: {
        get(key: string): string | undefined;
        toObject(): { [key: string]: string };
    };
    serve(handler: (req: Request) => Response | Promise<Response>): void;
    // Add other used Deno methods here if needed
};

declare module "https://esm.sh/@supabase/supabase-js@2.44.1" {
    export * from "supabase-js";
}

declare module "https://deno.land/std@0.190.0/http/server.ts" {
    export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
