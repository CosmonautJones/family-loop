import "@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "@supabase/server"
import {
  buildInvitationLink,
  buildInvitationText,
  buildResendRequest,
  invitationTokenToHex,
  parseAppOrigin,
  parseInvocationBody,
  parsePreparedDelivery,
  parseSender,
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
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (!Number.isFinite(contentLength) || contentLength > 2048) return json(400, { status: 'unavailable' })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json(400, { status: 'unavailable' })
  }
  const input = parseInvocationBody(body)
  const tokenHex = input ? invitationTokenToHex(input.token) : null
  const apiKey = Deno.env.get('RESEND_INVITATION_API_KEY')
  if (!input || !tokenHex || !appOrigin || !sender || !apiKey) return json(503, { status: 'unavailable' })

  const { data, error } = await ctx.supabase.rpc('loopedin_prepare_invitation_email', {
    target_invitation_id: input.invitationId,
    target_token: tokenHex,
    target_operation_key: input.deliveryKey,
  })
  if (error) return json(403, { status: 'unavailable' })
  const prepared = parsePreparedDelivery(data)
  if (prepared.code === 'provider_accepted') return json(202, { status: 'provider_accepted' })
  if (prepared.code === 'try_later') return json(429, { status: 'try_later' })
  if (prepared.code !== 'prepared') return json(403, { status: 'unavailable' })

  const invitationLink = buildInvitationLink(appOrigin, input.token)
  const text = invitationLink ? buildInvitationText({ ...prepared, invitationLink }) : null
  const providerRequest = text ? buildResendRequest({
    apiKey,
    sender,
    recipient: prepared.inviteeEmail,
    text,
    deliveryId: prepared.deliveryId,
  }) : null
  if (!providerRequest) return json(503, { status: 'unavailable' })

  let providerAccepted = false
  try {
    const providerResponse = await fetch(providerRequest.url, {
      ...providerRequest.init,
      signal: AbortSignal.timeout(10_000),
    })
    providerAccepted = providerResponse.ok
    await providerResponse.body?.cancel()
  } catch {
    providerAccepted = false
  }

  const outcome = providerAccepted ? 'provider_accepted' : 'provider_failed'
  const { data: finalized, error: finalizeError } = await ctx.supabase.rpc('loopedin_finalize_invitation_email', {
    target_delivery_id: prepared.deliveryId,
    target_token: tokenHex,
    target_outcome: outcome,
  })
  if (finalizeError || finalized?.ok !== true || finalized?.code !== outcome) return json(503, { status: 'unavailable' })
  return providerAccepted
    ? json(202, { status: 'provider_accepted' })
    : json(503, { status: 'provider_unavailable' })
})

export default {
  fetch(req: Request) {
    if (!appOrigin || req.headers.get('origin') !== appOrigin) {
      return Response.json({ status: 'unavailable' }, { status: 403, headers: { 'Cache-Control': 'no-store', 'Vary': 'Origin' } })
    }
    return authenticatedHandler(req)
  },
}
