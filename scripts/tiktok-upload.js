#!/usr/bin/env node
// TikTok Content Posting API uploader.
//
// One-time setup:
//   1. Register an app at https://developers.tiktok.com → add the "Content Posting API"
//      product, request the video.publish scope, set a redirect URI.
//   2. export TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=... TIKTOK_REDIRECT_URI=...
//   3. node scripts/tiktok-upload.js auth        # one-time login, saves token file
//
// Then:
//   node scripts/tiktok-upload.js post <video.mp4> "Caption #hashtag" [--public]
//
// ponytail: single-chunk upload only — all our renders are <6MB (API cap is 64MB/chunk).

import fs from 'node:fs'
import readline from 'node:readline/promises'

const TOKEN_FILE = new URL('.tiktok-token.json', import.meta.url).pathname

// load .env from repo root so the script works without exports
for (const line of fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
}
const { TIKTOK_CLIENT_KEY: KEY, TIKTOK_CLIENT_SECRET: SECRET, TIKTOK_REDIRECT_URI: REDIRECT } = process.env

async function api(url, { token, form, json } = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json; charset=UTF-8',
    },
    body: form ? new URLSearchParams(form).toString() : JSON.stringify(json ?? {}),
  })
  const body = await res.json()
  if (!res.ok || (body.error && body.error.code !== 'ok')) {
    throw new Error(`${url}\n${JSON.stringify(body, null, 2)}`)
  }
  return body
}

function saveToken(data) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ ...data, expires_at: Date.now() + data.expires_in * 1000 }, null, 2))
}

async function getToken() {
  const t = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
  if (Date.now() < t.expires_at - 60_000) return t.access_token
  const refreshed = await api('https://open.tiktokapis.com/v2/oauth/token/', {
    form: { client_key: KEY, client_secret: SECRET, grant_type: 'refresh_token', refresh_token: t.refresh_token },
  })
  saveToken(refreshed)
  return refreshed.access_token
}

async function auth() {
  const url = 'https://www.tiktok.com/v2/auth/authorize/?' + new URLSearchParams({
    client_key: KEY, scope: 'video.publish', response_type: 'code', redirect_uri: REDIRECT, state: 'kidsit',
  })
  console.log(`\nOpen this URL, log in, approve:\n\n${url}\n`)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const pasted = await rl.question('Paste the full URL you were redirected to: ')
  rl.close()
  const code = new URL(pasted.trim()).searchParams.get('code')
  if (!code) throw new Error('no ?code= in that URL')
  const tok = await api('https://open.tiktokapis.com/v2/oauth/token/', {
    form: { client_key: KEY, client_secret: SECRET, code, grant_type: 'authorization_code', redirect_uri: REDIRECT },
  })
  saveToken(tok)
  console.log(`Authorized. Token saved to ${TOKEN_FILE} (auto-refreshes for 365 days).`)
}

async function post(file, title, isPublic) {
  const video = fs.readFileSync(file)
  if (video.length > 64 * 1024 * 1024) throw new Error('video >64MB — needs chunked upload, not implemented')
  const token = await getToken()

  const creator = await api('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', { token })
  const allowed = creator.data.privacy_level_options
  const privacy = isPublic ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY'
  if (!allowed.includes(privacy)) {
    throw new Error(`privacy ${privacy} not allowed for this account; allowed: ${allowed.join(', ')}\n` +
      '(unaudited apps can only post SELF_ONLY — private, visible just to you)')
  }

  const init = await api('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    token,
    json: {
      post_info: { title, privacy_level: privacy },
      source_info: { source: 'FILE_UPLOAD', video_size: video.length, chunk_size: video.length, total_chunk_count: 1 },
    },
  })
  const { publish_id, upload_url } = init.data

  const put = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(video.length),
      'Content-Range': `bytes 0-${video.length - 1}/${video.length}`,
    },
    body: video,
  })
  if (!put.ok) throw new Error(`upload PUT failed: ${put.status} ${await put.text()}`)
  console.log(`Uploaded ${file} (${(video.length / 1e6).toFixed(1)}MB), publish_id ${publish_id}`)

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const s = await api('https://open.tiktokapis.com/v2/post/publish/status/fetch/', { token, json: { publish_id } })
    const status = s.data.status
    console.log(`  status: ${status}`)
    if (status === 'PUBLISH_COMPLETE') return console.log(`Published${privacy === 'SELF_ONLY' ? ' (private — only you can see it)' : ''}.`)
    if (status === 'FAILED') throw new Error(`publish failed: ${s.data.fail_reason}`)
  }
  console.log('Still processing — check your TikTok profile in a few minutes.')
}

const [cmd, file, title] = process.argv.slice(2)
if (!KEY || !SECRET || !REDIRECT) {
  console.error('Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI first.')
  process.exit(1)
}
if (cmd === 'auth') await auth()
else if (cmd === 'post' && file && title) await post(file, title, process.argv.includes('--public'))
else { console.error('usage: tiktok-upload.js auth | post <video.mp4> "caption" [--public]'); process.exit(1) }
