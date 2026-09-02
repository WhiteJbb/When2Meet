import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import pg from 'pg'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 3000)
const appUrl = (process.env.APP_URL || (isProduction ? 'https://when2meet.nangman.cloud' : 'http://localhost:5173')).replace(/\/$/, '')
const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY
const kakaoRedirectUri = process.env.KAKAO_REDIRECT_URI || `${appUrl}/api/auth/kakao/callback`
const sessionCookieName = 'w2w_session'
const oauthStateCookieName = 'w2w_kakao_oauth_state'

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'when2meet',
      user: process.env.DB_USER || 'when2meet',
      password: process.env.DB_PASSWORD || 'when2meet-dev-only',
    }

if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false }
}

const pool = new Pool({ ...poolConfig, max: Number(process.env.DB_POOL_MAX || 10) })

app.disable('x-powered-by')
app.use(express.json({ limit: '256kb' }))

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, item) => {
    const separator = item.indexOf('=')
    if (separator === -1) return cookies
    const key = item.slice(0, separator).trim()
    const value = item.slice(separator + 1).trim()
    if (key) cookies[key] = decodeURIComponent(value)
    return cookies
  }, {})
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || '/'}`, 'HttpOnly', 'SameSite=Lax']
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (isProduction) parts.push('Secure')
  return parts.join('; ')
}

function clearCookie(name, pathValue = '/') {
  return serializeCookie(name, '', { maxAge: 0, path: pathValue })
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || !left || !right) return false
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    nickname: user.nickname,
    profile_image_url: user.profile_image_url,
  }
}

async function getSessionUser(req) {
  const sessionToken = parseCookies(req.headers.cookie)[sessionCookieName]
  if (!sessionToken) return null

  const { rows } = await pool.query(
    `SELECT u.id, u.nickname, u.profile_image_url
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(sessionToken)],
  )
  return rows[0] || null
}

function validateRoomInput(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const dates = Array.isArray(body?.dates) ? body.dates : []
  const timeStart = Number(body?.time_start)
  const timeEnd = Number(body?.time_end)

  if (!title || title.length > 60) throw new Error('Title must be between 1 and 60 characters')
  if (dates.length < 1 || dates.length > 30 || dates.some(date => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw new Error('Dates must contain 1 to 30 valid dates')
  }
  if (!Number.isInteger(timeStart) || !Number.isInteger(timeEnd) || timeStart < 0 || timeEnd > 24 || timeEnd < 1 || timeStart >= timeEnd) {
    throw new Error('Invalid time range')
  }

  return { title, dates, timeStart, timeEnd }
}

function validateAvailabilityInput(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const slots = Array.isArray(body?.slots) ? body.slots : []

  if (!name || name.length > 20) throw new Error('Name must be between 1 and 20 characters')
  if (slots.length < 1 || slots.some(slot => typeof slot !== 'string' || slot.length > 100)) {
    throw new Error('At least one valid slot is required')
  }

  return { name, slots }
}

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/config', (_req, res) => {
  res.json({ kakao_login: Boolean(kakaoRestApiKey) })
})

app.get('/api/auth/me', async (req, res, next) => {
  try {
    res.json({ user: publicUser(await getSessionUser(req)) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/kakao', (_req, res) => {
  if (!kakaoRestApiKey) {
    return res.status(503).json({ error: 'Kakao login is not configured' })
  }

  const state = crypto.randomBytes(32).toString('hex')
  res.setHeader('Set-Cookie', serializeCookie(oauthStateCookieName, state, {
    maxAge: 600,
    path: '/api/auth/kakao/callback',
  }))

  const params = new URLSearchParams({
    client_id: kakaoRestApiKey,
    redirect_uri: kakaoRedirectUri,
    response_type: 'code',
    state,
  })
  res.redirect(`https://kauth.kakao.com/oauth/authorize?${params.toString()}`)
})

app.get('/api/auth/kakao/callback', async (req, res, next) => {
  const redirectWithError = (message) => {
    const query = new URLSearchParams({ auth_error: message })
    res.redirect(`${appUrl}/?${query.toString()}`)
  }

  if (req.query.error) {
    res.setHeader('Set-Cookie', clearCookie(oauthStateCookieName, '/api/auth/kakao/callback'))
    return redirectWithError('카카오 로그인이 취소되었습니다.')
  }

  const cookies = parseCookies(req.headers.cookie)
  if (!safeEqual(req.query.state, cookies[oauthStateCookieName])) {
    res.setHeader('Set-Cookie', clearCookie(oauthStateCookieName, '/api/auth/kakao/callback'))
    return res.status(400).send('Invalid Kakao login state')
  }

  try {
    if (!kakaoRestApiKey || typeof req.query.code !== 'string') {
      return res.status(400).send('Kakao authorization code is missing')
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: kakaoRestApiKey,
      redirect_uri: kakaoRedirectUri,
      code: req.query.code,
    })
    if (process.env.KAKAO_CLIENT_SECRET) tokenParams.set('client_secret', process.env.KAKAO_CLIENT_SECRET)

    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: tokenParams,
    })
    const tokenPayload = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new Error(`Kakao token request failed: ${tokenPayload.error_description || tokenResponse.status}`)
    }

    const profileResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    })
    const profilePayload = await profileResponse.json()
    if (!profileResponse.ok || !profilePayload.id) {
      throw new Error(`Kakao profile request failed: ${profileResponse.status}`)
    }

    const nickname = profilePayload.kakao_account?.profile?.nickname || profilePayload.properties?.nickname || null
    const profileImageUrl = profilePayload.kakao_account?.profile?.profile_image_url || profilePayload.properties?.profile_image || null
    const userResult = await pool.query(
      `INSERT INTO users (provider, provider_user_id, nickname, profile_image_url)
       VALUES ('kakao', $1, $2, $3)
       ON CONFLICT (provider, provider_user_id)
       DO UPDATE SET nickname = EXCLUDED.nickname,
                     profile_image_url = EXCLUDED.profile_image_url,
                     updated_at = now()
       RETURNING id`,
      [String(profilePayload.id), nickname, profileImageUrl],
    )

    const sessionToken = crypto.randomBytes(32).toString('hex')
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '30 days')`,
      [userResult.rows[0].id, hashToken(sessionToken)],
    )

    res.setHeader('Set-Cookie', [
      clearCookie(oauthStateCookieName, '/api/auth/kakao/callback'),
      serializeCookie(sessionCookieName, sessionToken, { maxAge: 60 * 60 * 24 * 30 }),
    ])
    res.redirect(appUrl)
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', async (req, res, next) => {
  try {
    const sessionToken = parseCookies(req.headers.cookie)[sessionCookieName]
    if (sessionToken) {
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(sessionToken)])
    }
    res.setHeader('Set-Cookie', clearCookie(sessionCookieName))
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/rooms', async (req, res, next) => {
  try {
    const { title, dates, timeStart, timeEnd } = validateRoomInput(req.body)
    const ownerToken = crypto.randomBytes(32).toString('hex')
    const ownerUser = await getSessionUser(req)
    const { rows } = await pool.query(
      `INSERT INTO rooms (title, dates, time_start, time_end, owner_token_hash, owner_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, dates, time_start, time_end, created_at`,
      [title, dates, timeStart, timeEnd, hashToken(ownerToken), ownerUser?.id || null],
    )

    res.status(201).json({ ...rows[0], owner_token: ownerToken, owner_type: ownerUser ? 'account' : 'guest' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/rooms/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid room id' })
    const ownerUser = await getSessionUser(req)
    const { rows } = await pool.query(
      `SELECT id, title, dates, time_start, time_end, created_at,
              owner_user_id IS NULL AS is_unclaimed,
              COALESCE(owner_user_id = $2::uuid, false) AS is_account_owner
       FROM rooms WHERE id = $1`,
      [req.params.id, ownerUser?.id || null],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Room not found' })
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
})

app.post('/api/rooms/:id/claim', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid room id' })
    const ownerUser = await getSessionUser(req)
    if (!ownerUser) return res.status(401).json({ error: 'Login is required to claim a room' })
    const ownerToken = req.get('x-owner-token')
    if (!ownerToken) return res.status(403).json({ error: 'Owner token is required' })

    const { rows } = await pool.query(
      `UPDATE rooms
       SET owner_user_id = $2
       WHERE id = $1 AND owner_token_hash = $3 AND owner_user_id IS NULL
       RETURNING id`,
      [req.params.id, ownerUser.id, hashToken(ownerToken)],
    )
    if (rows[0]) return res.json({ ok: true })

    const roomResult = await pool.query('SELECT id, owner_user_id FROM rooms WHERE id = $1', [req.params.id])
    if (!roomResult.rows[0]) return res.status(404).json({ error: 'Room not found' })
    if (roomResult.rows[0].owner_user_id === ownerUser.id) return res.json({ ok: true })
    res.status(409).json({ error: 'This room is already linked to another account' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/rooms/:id/availability', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid room id' })
    const { rows } = await pool.query(
      `SELECT id, room_id, name, slots, updated_at, created_at
       FROM availability WHERE room_id = $1 ORDER BY created_at ASC`,
      [req.params.id],
    )
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.put('/api/rooms/:id/availability', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid room id' })
    const { name, slots } = validateAvailabilityInput(req.body)
    const { rows } = await pool.query(
      `INSERT INTO availability (room_id, name, slots)
       VALUES ($1, $2, $3)
       ON CONFLICT (room_id, name)
       DO UPDATE SET slots = EXCLUDED.slots, updated_at = now()
       RETURNING id, room_id, name, slots, updated_at, created_at`,
      [req.params.id, name, slots],
    )
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
})

app.delete('/api/rooms/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid room id' })
    const ownerToken = req.get('x-owner-token')
    const ownerUser = await getSessionUser(req)
    if (!ownerToken && !ownerUser) return res.status(403).json({ error: 'Room owner authorization is required' })

    const { rowCount } = await pool.query(
      `DELETE FROM rooms
       WHERE id = $1
         AND (($2::text IS NOT NULL AND owner_token_hash = $2)
           OR ($3::uuid IS NOT NULL AND owner_user_id = $3::uuid))`,
      [req.params.id, ownerToken ? hashToken(ownerToken) : null, ownerUser?.id || null],
    )
    if (rowCount === 0) return res.status(403).json({ error: 'Only the room owner can delete this room' })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

app.use((error, _req, res, _next) => {
  console.error(error)
  if (error.code === '23505') return res.status(409).json({ error: 'Availability already exists' })
  if (error.message?.startsWith('Title ') || error.message?.startsWith('Dates ') || error.message?.startsWith('Invalid time') || error.message?.startsWith('Name ') || error.message?.startsWith('At least ')) {
    return res.status(400).json({ error: error.message })
  }
  res.status(500).json({ error: 'Internal server error' })
})

async function cleanupExpiredData() {
  try {
    const { rowCount: roomCount } = await pool.query(
      `DELETE FROM rooms
       WHERE dates[array_upper(dates, 1)] IS NOT NULL
         AND (dates[array_upper(dates, 1)]::date + interval '5 days') < now()`,
    )
    const { rowCount: sessionCount } = await pool.query('DELETE FROM sessions WHERE expires_at < now()')
    if (roomCount > 0) console.log(`Removed ${roomCount} expired room(s)`)
    if (sessionCount > 0) console.log(`Removed ${sessionCount} expired session(s)`)
  } catch (error) {
    console.error('Expired data cleanup failed', error)
  }
}

async function start() {
  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(schema)
  await cleanupExpiredData()

  const server = app.listen(port, () => {
    console.log(`When2Meet server listening on port ${port}`)
  })

  const cleanupTimer = setInterval(cleanupExpiredData, 60 * 60 * 1000)
  cleanupTimer.unref()

  const shutdown = async () => {
    server.close()
    await pool.end()
    process.exit(0)
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

start().catch(error => {
  console.error('Failed to start server', error)
  process.exit(1)
})
