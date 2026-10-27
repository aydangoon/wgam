#!/usr/bin/env node
// Dump every email captured by the landing-page form (stored in Upstash Redis
// by src/app/api/subscribe/route.ts) to a CSV.
//
// Usage:
//   npm run emails:export                 # writes ./emails.csv
//   npm run emails:export -- out.csv      # custom path
//
// Needs UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_*
// equivalents) in .env.local — run `vercel env pull .env.local` to fetch them.

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { Redis } from '@upstash/redis'

// Keep in sync with src/app/api/subscribe/route.ts.
const EMAILS_SET_KEY = 'emails'
const EMAILS_META_KEY = 'emails:meta'

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
if (!url || !token) {
  console.error(
    'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. Run `vercel env pull .env.local` and retry via `npm run emails:export`.',
  )
  process.exit(1)
}

const out = path.resolve(process.argv[2] ?? 'emails.csv')
const redis = new Redis({ url, token })

const [emails, meta] = await Promise.all([
  redis.smembers(EMAILS_SET_KEY),
  redis.hgetall(EMAILS_META_KEY),
])

function parseMeta(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const csvEscape = v => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const rows = emails
  .map(email => {
    const m = parseMeta(meta?.[email])
    return { email, ts: m.ts ?? '', ua: m.ua ?? '', referer: m.referer ?? '' }
  })
  .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a.email.localeCompare(b.email)))

const csv = [
  'email,signed_up_at,user_agent,referer',
  ...rows.map(r => [r.email, r.ts, r.ua, r.referer].map(csvEscape).join(',')),
].join('\n')

writeFileSync(out, csv + '\n')
console.log(`Wrote ${rows.length} email${rows.length === 1 ? '' : 's'} to ${out}`)
