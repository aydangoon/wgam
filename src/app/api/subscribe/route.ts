import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const runtime = 'nodejs'

// Keep in sync with scripts/export-emails.mjs.
/** Redis Set of every lowercased email that has signed up. */
const EMAILS_SET_KEY = 'emails'
/** Redis Hash: email -> JSON `{ ts, ua, referer }` for the first signup. */
const EMAILS_META_KEY = 'emails:meta'

const MAX_EMAIL_LENGTH = 254
// Intentionally loose: one "@", something on both sides, a dot in the domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const email = input.trim().toLowerCase()
  if (!email || email.length > MAX_EMAIL_LENGTH) return null
  if (!EMAIL_RE.test(email)) return null
  return email
}

function hasRedisEnv() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
  )
}

// Created lazily so `next build` never evaluates env at module load.
let redis: Redis | null = null
function getRedis() {
  if (!redis) {
    // The Vercel Marketplace integration may inject either the UPSTASH_* or
    // the legacy KV_* names depending on how the store was created.
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN!,
    })
  }
  return redis
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 })
  }

  const email = normalizeEmail((body as { email?: unknown } | null)?.email)
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 })
  }

  if (!hasRedisEnv()) {
    if (process.env.NODE_ENV !== 'production') {
      // Local dev without the Upstash integration wired up: don't block the UI.
      console.log(`[subscribe] (no redis configured) would store: ${email}`)
      return NextResponse.json({ ok: true, already: false, stored: false })
    }
    console.error('[subscribe] Upstash Redis env vars are not set.')
    return NextResponse.json({ ok: false, error: 'Something went wrong. Try again.' }, { status: 500 })
  }

  try {
    const meta = JSON.stringify({
      ts: new Date().toISOString(),
      ua: req.headers.get('user-agent') ?? '',
      referer: req.headers.get('referer') ?? '',
    })

    const r = getRedis()
    const pipeline = r.pipeline()
    pipeline.sadd(EMAILS_SET_KEY, email)
    // hsetnx keeps the first signup's metadata on repeat submissions.
    pipeline.hsetnx(EMAILS_META_KEY, email, meta)
    const [added] = await pipeline.exec<[number, number]>()

    return NextResponse.json({ ok: true, already: added === 0, stored: true })
  } catch (err) {
    console.error('[subscribe] redis error', err)
    return NextResponse.json({ ok: false, error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
