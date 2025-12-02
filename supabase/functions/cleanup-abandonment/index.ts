import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { fingerprint_hash } = await req.json()

    if (!fingerprint_hash) {
      return new Response(
        JSON.stringify({ error: 'fingerprint_hash is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[cleanup-abandonment] Processing cleanup for fingerprint_hash: ${fingerprint_hash}`)

    // Remove abandonment records for this fingerprint_hash that were created within the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: deletedRecords, error: deleteError } = await supabaseClient
      .from('oreino360-abandono')
      .delete()
      .eq('fingerprint_hash', fingerprint_hash)
      .gte('created_at', twentyFourHoursAgo)
      .select()

    if (deleteError) {
      console.error('[cleanup-abandonment] Error deleting abandonment records:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to cleanup abandonment records', details: deleteError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const deletedCount = deletedRecords?.length || 0
    console.log(`[cleanup-abandonment] Successfully deleted ${deletedCount} abandonment records for fingerprint_hash: ${fingerprint_hash}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_count: deletedCount,
        fingerprint_hash: fingerprint_hash,
        message: `Cleaned up ${deletedCount} abandonment records within 24 hours for fingerprint ${fingerprint_hash}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[cleanup-abandonment] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})