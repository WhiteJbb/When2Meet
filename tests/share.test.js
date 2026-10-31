import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import sharp from 'sharp'
import { createShareRouter, renderSharePage, renderShareImage } from '../server/share.js'

const room = {
  id: 'f970863b-f027-484b-8425-948e814f1334',
  title: '우리 주말 모임 🎉', dates: ['2099-01-01', '2099-01-02'], time_start: 9, time_end: 24,
}

test('share HTML escapes meeting names and exposes crawler-readable metadata', () => {
  const html = renderSharePage({ ...room, title: '</title><script>alert("x")</script> & 친구' }, 'https://example.com')
  assert.ok(html.includes('&lt;/title&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; 친구'))
  assert.ok(!html.includes('<script>alert'))
  assert.ok(html.includes(`content="https://example.com/share/${room.id}/image.png?v=1"`))
  assert.ok(html.includes(`location.replace('/#/room/${room.id}')`))
  assert.ok(html.includes('09:00–24:00'))
})

test('PNG supports long Korean names, special characters and distinct meeting titles', async () => {
  let previous
  for (const title of [room.title, '가'.repeat(60), '<우리 & 친구들> "약속"', '밥']) {
    const image = await renderShareImage({ ...room, title })
    const info = await sharp(image).metadata()
    assert.equal(info.format, 'png')
    assert.equal(info.width, 1200)
    assert.equal(info.height, 630)
    if (previous) assert.ok(!image.equals(previous))
    previous = image
  }
})

test('share routes use configured origin and stop serving cached images after room deletion', async () => {
  let present = true
  let queries = 0
  const app = express()
  app.use('/share', createShareRouter({ query: async (sql, params) => {
    assert.equal(sql, 'SELECT id, title, dates, time_start, time_end FROM rooms WHERE id = $1')
    assert.deepEqual(params, [room.id])
    queries++
    return { rows: present ? [room] : [] }
  } }, 'https://example.com'))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    assert.equal((await fetch(`${origin}/share/invalid`)).status, 400)
    assert.equal(queries, 0)
    const response = await fetch(`${origin}/share/${room.id}`, { headers: { Host: 'untrusted.example' } })
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.ok(html.includes(room.title))
    assert.ok(!html.includes('untrusted.example'))
    const png = await fetch(`${origin}/share/${room.id}/image.png?v=1`)
    assert.equal(png.status, 200)
    assert.equal(png.headers.get('content-type'), 'image/png')
    const bytes = Buffer.from(await png.arrayBuffer())
    const cached = await fetch(`${origin}/share/${room.id}/image.png?v=1`)
    assert.ok(bytes.equals(Buffer.from(await cached.arrayBuffer())))
    present = false
    const missing = await fetch(`${origin}/share/${room.id}/image.png?v=1`)
    assert.equal(missing.status, 404)
    assert.equal(missing.headers.get('cache-control'), 'no-store')
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})
