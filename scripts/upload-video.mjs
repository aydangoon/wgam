#!/usr/bin/env node
// Encode the "New Crashed Car" music video for the web and upload it (plus a
// poster frame) to Vercel Blob, writing the URLs to src/lib/epk/video.json.
//
// The web encode is H.264/AAC with +faststart so browsers can start playing
// before the whole file is downloaded. The original is left untouched.
//
// Usage:
//   npm run video:upload -- path/to/original.mp4
//   npm run video:upload -- path/to/original.mp4 --force   # overwrite blobs

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { list, put } from '@vercel/blob'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_JSON = path.join(ROOT, 'src/lib/epk/video.json')
const BLOB_PREFIX = 'epk/video'
const ID = 'new-crashed-car'
const POSTER_AT_S = 12
const ONE_YEAR = 60 * 60 * 24 * 365

const args = process.argv.slice(2)
const force = args.includes('--force')
const input = args.find(a => !a.startsWith('--'))

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local and run via `npm run video:upload`.')
  process.exit(1)
}
if (!input || !existsSync(input)) {
  console.error('Pass the path to the source video: npm run video:upload -- "path/to/video.mp4"')
  process.exit(1)
}

const workDir = path.join(tmpdir(), 'wgam-video')
mkdirSync(workDir, { recursive: true })
const webMp4 = path.join(workDir, `${ID}.mp4`)
const poster = path.join(workDir, `${ID}-poster.jpg`)

function probe(file) {
  const out = execFileSync(
    'ffprobe',
    [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:format=duration',
      '-of', 'json',
      file,
    ],
    { encoding: 'utf8' },
  )
  const j = JSON.parse(out)
  return {
    width: j.streams[0].width,
    height: j.streams[0].height,
    duration: Number(j.format.duration),
  }
}

console.log(`encoding ${path.basename(input)} -> ${path.basename(webMp4)} (this takes a few minutes)`)
const t0 = Date.now()
execFileSync(
  'ffmpeg',
  [
    '-y', '-hide_banner', '-loglevel', 'error', '-stats',
    '-i', input,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
    '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ac', '2',
    '-movflags', '+faststart',
    webMp4,
  ],
  { stdio: 'inherit' },
)
console.log(`encoded in ${((Date.now() - t0) / 1000).toFixed(0)}s`)

execFileSync(
  'ffmpeg',
  ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(POSTER_AT_S), '-i', webMp4, '-frames:v', '1', '-q:v', '3', poster],
  { stdio: 'inherit' },
)

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

async function upload(pathname, file, contentType, existing) {
  const bytes = statSync(file).size
  const prior = existing.get(pathname)
  if (prior && !force) {
    console.log(`skip    ${pathname} (exists)`)
    return { url: prior.url, bytes }
  }
  const started = Date.now()
  const blob = await put(pathname, readFileSync(file), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    multipart: bytes > 8 * 1024 * 1024,
    contentType,
    cacheControlMaxAge: ONE_YEAR,
  })
  console.log(`upload  ${pathname}  ${(bytes / 1024 / 1024).toFixed(1)} MB  ${((Date.now() - started) / 1000).toFixed(1)}s`)
  return { url: blob.url, bytes }
}

const existing = await existingBlobs()
const meta = probe(webMp4)
const video = {
  id: ID,
  title: 'New Crashed Car',
  ...meta,
  mp4: await upload(`${BLOB_PREFIX}/${ID}.mp4`, webMp4, 'video/mp4', existing),
  poster: await upload(`${BLOB_PREFIX}/${ID}-poster.jpg`, poster, 'image/jpeg', existing),
}

mkdirSync(path.dirname(OUT_JSON), { recursive: true })
writeFileSync(OUT_JSON, JSON.stringify(video, null, 2) + '\n')
console.log(`\nwrote ${path.relative(ROOT, OUT_JSON)}`)
