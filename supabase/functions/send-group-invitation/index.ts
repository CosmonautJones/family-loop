import "@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "@supabase/server"
import {
  parseAppOrigin,
  parseInvocationBody,
  parseSender,
  readJsonBody,
  runInvitationEmail,
} from "./core.mjs"

const appOrigin = parseAppOrigin(Deno.env.get('LOOPEDIN_APP_ORIGIN'))
const sender = parseSender(Deno.env.get('RESEND_INVITATION_FROM'))
const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin ?? 'null',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '600',
  'Vary': 'Origin',
}

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
}

const authenticatedHandler = withSupabase({ auth: "user", cors: { headers: corsHeaders } }, async (req, ctx) => {
  if (req.method !== 'POST') return json(405, { status: 'unavailable' })
  const parsedBody = await readJsonBody(req)
  if (!parsedBody.ok) return json(400, { status: 'unavailable' })
  const input = parseInvocationBody(parsedBody.value)
  const apiKey = Deno.env.get('RESEND_INVITATION_API_KEY')
  const actorId = typeof ctx.userClaims?.id === 'string' ? ctx.userClaims.id : ''
  const result = await runInvitationEmail({
    input,
    actorId,
    appOrigin,
    sender,
    apiKey,
    prepare: async (parameters) => {
      const { data, error } = await ctx.supabase.rpc('loopedin_prepare_invitation_email', parameters)
      if (error) throw error
      return data
    },
    finalize: async (parameters) => {
      const { data, error } = await ctx.supabaseAdmin.rpc('loopedin_finalize_invitation_email', parameters)
      if (error) throw error
      return data
    },
    send: async (providerRequest) => {
      const providerResponse = await fetch(providerRequest.url, {
        ...providerRequest.init,
        signal: AbortSignal.timeout(10_000),
      })
      await providerResponse.body?.cancel()
      return providerResponse.ok
    },
  })
  return json(result.httpStatus, { status: result.status })
})

export default {
  fetch(req: Request) {
    if (!appOrigin || req.headers.get('origin') !== appOrigin) {
      return Response.json({ status: 'unavailable' }, { status: 403, headers: { 'Cache-Control': 'no-store', 'Vary': 'Origin' } })
    }
    return authenticatedHandler(req)
  },
}
