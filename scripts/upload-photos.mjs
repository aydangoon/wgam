#!/usr/bin/env node
// Upload the high-res press photos to Vercel Blob and write the public URLs
// to src/lib/epk/photos.json (which IS committed; the site only reads that).
//
// For each original in photos-src/*.jpg this makes a ~2000px preview and a
// ~320px thumb with macOS `sips`, then uploads original + preview + thumb.
// Blobs that already exist are skipped unless --force is passed.
//
// Usage:
//   npm run photos:upload            # needs BLOB_READ_WRITE_TOKEN in .env.local
//   npm run photos:upload -- --force # re-upload / overwrite everything

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { list, put } from '@vercel/blob'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC_DIR = path.join(ROOT, 'photos-src')
const OUT_JSON = path.join(ROOT, 'src/lib/epk/photos.json')
const BLOB_PREFIX = 'epk/photos'
const PREVIEW_PX = 2000
const THUMB_PX = 320
const JPEG_QUALITY = 82
const ONE_YEAR = 60 * 60 * 24 * 365

const force = process.argv.includes('--force')

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local and run via `npm run photos:upload`.')
  process.exit(1)
}

const sources = readdirSync(SRC_DIR)
  .filter(f => /\.jpe?g$/i.test(f))
  .sort()
if (sources.length === 0) {
  console.error(`No JPGs found in ${SRC_DIR}`)
  process.exit(1)
}

const workDir = path.join(tmpdir(), 'wgam-photo-derivatives')
mkdirSync(workDir, { recursive: true })

function dimensions(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], {
    encoding: 'utf8',
  })
  const width = Number(/pixelWidth:\s*(\d+)/.exec(out)?.[1])
  const height = Number(/pixelHeight:\s*(\d+)/.exec(out)?.[1])
  return { width, height }
}

function resize(input, output, maxPx) {
  execFileSync(
    'sips',
    [
      '-Z',
      String(maxPx),
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      String(JPEG_QUALITY),
      input,
      '--out',
      output,
    ],
    { stdio: 'ignore' },
  )
}

async function existingBlobs() {
  const byPath = new Map()
  let cursor
  do {
    const page = await list({ prefix: `${BLOB_PREFIX}/`, cursor, limit: 1000 })
    for (const b of page.blobs) byPath.set(b.pathname, b)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return byPath
}

async function upload(pathname, file, existing) {
  const bytes = statSync(file).size
  const { width, height } = dimensions(file)
  const prior = existing.get(pathname)
  if (prior && !force) {
    console.log(`skip    ${pathname} (exists)`)
    return { url: prior.url, bytes, width, height }
  }
  const started = Date.now()
  const blob = await put(pathname, readFileSync(file), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    multipart: bytes > 8 * 1024 * 1024,
    contentType: 'image/jpeg',
    cacheControlMaxAge: ONE_YEAR,
  })
  const secs = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`upload  ${pathname}  ${(bytes / 1024 / 1024).toFixed(1)} MB  ${secs}s`)
  return { url: blob.url, bytes, width, height }
}

const existing = await existingBlobs()
const photos = []

for (const name of sources) {
  const id = path.parse(name).name
  const original = path.join(SRC_DIR, name)
  const preview = path.join(workDir, `${id}-preview.jpg`)
  const thumb = path.join(workDir, `${id}-thumb.jpg`)

  console.log(`\n${id}`)
  resize(original, preview, PREVIEW_PX)
  resize(original, thumb, THUMB_PX)

  photos.push({
    id,
    original: await upload(`${BLOB_PREFIX}/original/${id}.jpg`, original, existing),
    preview: await upload(`${BLOB_PREFIX}/preview/${id}.jpg`, preview, existing),
    thumb: await upload(`${BLOB_PREFIX}/thumb/${id}.jpg`, thumb, existing),
  })
}

mkdirSync(path.dirname(OUT_JSON), { recursive: true })
writeFileSync(OUT_JSON, JSON.stringify(photos, null, 2) + '\n')
console.log(`\nwrote ${path.relative(ROOT, OUT_JSON)} (${photos.length} photos)`)
