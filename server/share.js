import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import sharp from 'sharp'

const directory = path.dirname(fileURLToPath(import.meta.url))
process.env.FONTCONFIG_FILE ||= path.join(directory, 'fonts/fonts.conf')
const fontfile = path.join(directory, 'fonts/NotoSansKR-Bold.otf')
const publicPhoto = path.resolve(directory, '../public/images/dinner.jpg')
const photoPath = existsSync(publicPhoto) ? publicPhoto : path.resolve(directory, '../dist/images/dinner.jpg')
const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
})

export function escapeHtml(value) {
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

function roomPeriod(room) {
  return dateFormat.formatRange(new Date(`${room.dates[0]}T12:00:00Z`), new Date(`${room.dates.at(-1)}T12:00:00Z`))
}

function roomHours(room) {
  return `${String(room.time_start).padStart(2, '0')}:00–${String(room.time_end).padStart(2, '0')}:00`
}

export function renderSharePage(room, origin) {
  const canonical = `${origin}/share/${room.id}`
  const image = `${canonical}/image.png?v=1`
  const title = `${room.title} | When2Meet`
  const description = `${roomPeriod(room)} · ${roomHours(room)}. 가능한 시간을 골라주세요.`
  const meta = (name, value, attr = 'property') => `<meta ${attr}="${name}" content="${escapeHtml(value)}">`
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${meta('robots', 'noindex', 'name')}
${meta('description', description, 'name')}
${meta('og:type', 'website')}
${meta('og:site_name', 'When2Meet')}
${meta('og:locale', 'ko_KR')}
${meta('og:url', canonical)}
${meta('og:title', title)}
${meta('og:description', description)}
${meta('og:image', image)}
${meta('og:image:type', 'image/png')}
${meta('og:image:width', '1200')}
${meta('og:image:height', '630')}
${meta('og:image:alt', `${room.title} — 가능한 시간을 골라주세요`)}
${meta('twitter:card', 'summary_large_image', 'name')}
${meta('twitter:title', title, 'name')}
${meta('twitter:description', description, 'name')}
${meta('twitter:image', image, 'name')}
<style>body{margin:0;padding:64px 24px;background:#e9edf0;color:#24292e;font-family:system-ui,sans-serif}main{max-width:600px;margin:auto}h1{overflow-wrap:anywhere}p{line-height:1.7}a{display:inline-block;padding:14px 24px;background:#24292e;color:white;border-radius:8px;text-decoration:none}</style>
</head><body><main><p>When2Meet</p><h1>${escapeHtml(room.title)}</h1><p>${escapeHtml(description)}</p><a href="/#/room/${room.id}">모임 열기</a></main>
<script>location.replace('/#/room/${room.id}')</script></body></html>`
}

async function textLayer(text, size, width, color = '#24292e', height) {
  return sharp({ text: {
    text: `<span foreground="${color}">${escapeHtml(text)}</span>`,
    font: `Noto Sans KR Bold ${size}`, fontfile, width, height,
    wrap: 'word-char', rgba: true,
  } }).png().toBuffer({ resolveWithObject: true })
}

export async function renderShareImage(room) {
  let title = await textLayer(room.title, 68, 630)
  if (title.info.height > 210) title = await textLayer(room.title, 68, 630, '#24292e', 210)
  const photo = await sharp(photoPath).resize(350, 444, { fit: 'cover' })
    .composite([{ input: Buffer.from('<svg width="350" height="444"><rect width="350" height="444" rx="18" fill="white"/></svg>'), blend: 'dest-in' }])
    .png().toBuffer()
  const labels = await Promise.all([
    textLayer('When2Meet', 30, 300),
    textLayer('함께 만날 시간을 정해요', 22, 630, '#52663b'),
    textLayer(roomPeriod(room), 21, 640, '#626a70'),
    textLayer(`${roomHours(room)} · 가능한 시간을 골라주세요`, 19, 640, '#626a70'),
    textLayer('가입 없이, 링크 하나로.', 19, 600, '#52663b'),
    textLayer('우리의 다음 약속', 25, 320, '#f6f7f8'),
    textLayer('만날 시간, 함께 정해요.', 18, 320, '#dce8f0'),
  ])
  const positions = [[110, 56], [64, 156], [64, 442], [64, 480], [64, 566], [776, 468], [776, 510]]
  const shapes = Buffer.from(`<svg width="1200" height="630">
    <path d="M64 59h30v5H64zm8 20h30v5H72z" fill="#24292e"/><path d="M74 69h30v5H74z" fill="#52663b"/>
    <rect x="744" y="440" width="392" height="126" rx="18" fill="#24313c" fill-opacity=".94"/>
  </svg>`)
  return sharp({ create: { width: 1200, height: 630, channels: 3, background: '#e9edf0' } })
    .composite([
      { input: photo, left: 786, top: 94 },
      { input: shapes, left: 0, top: 0 },
      { input: title.data, left: 64, top: 215 + Math.floor((210 - title.info.height) / 2) },
      ...labels.map((label, i) => ({ input: label.data, left: positions[i][0], top: positions[i][1] })),
    ]).png().toBuffer()
}

export function createShareRouter(pool, publicBaseUrl) {
  const router = Router()
  const origin = new URL(publicBaseUrl).origin
  // Bounded cache; the DB is still checked on each request so deleted rooms return 404.
  const images = new Map()
  router.use('/:id', async (req, res, next) => {
    try {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
        return res.status(400).set('Cache-Control', 'no-store').send('잘못된 모임 주소입니다.')
      }
      const { rows } = await pool.query('SELECT id, title, dates, time_start, time_end FROM rooms WHERE id = $1', [req.params.id])
      if (!rows[0]) return res.status(404).set('Cache-Control', 'no-store').send('모임을 찾을 수 없습니다.')
      res.locals.room = rows[0]
      next()
    } catch (error) { next(error) }
  })
  router.get('/:id', (req, res) => {
    res.set('Cache-Control', 'no-cache').type('html').send(renderSharePage(res.locals.room, origin))
  })
  router.get('/:id/image.png', async (req, res, next) => {
    try {
      const room = res.locals.room
      const key = JSON.stringify(room)
      if (!images.has(key)) {
        if (images.size >= 32) images.delete(images.keys().next().value)
        const image = renderShareImage(room).catch(error => { images.delete(key); throw error })
        images.set(key, image)
      }
      res.set('Cache-Control', 'public, max-age=300').type('png').send(await images.get(key))
    } catch (error) { next(error) }
  })
  return router
}
