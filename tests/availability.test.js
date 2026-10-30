import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { buildHeatmap, findBestSlots } from '../src/utils/timeUtils.js'

const slot = time => `2099-01-01|${time}`
const recommend = (responses, minutes) => findBestSlots(buildHeatmap(responses), responses, 5, minutes / 30)

test('recommendations support 30 minutes, duration limits, and unavailable responses', () => {
  const responses = [{ name: '가', slots: [slot('09:00')] }, { name: '나', slots: [] }]
  assert.equal(recommend(responses, 30)[0].durationMins, 30)
  assert.equal(recommend(responses, 30)[0].count, 1)
  assert.deepEqual(recommend(responses, 60), [])
  assert.deepEqual(recommend([{ name: '가', slots: [] }], 30), [])
})

test('same names are distinct people and cannot create false continuous availability', () => {
  const responses = [
    { name: '동명', slots: [slot('09:00'), slot('09:30')] },
    { name: '동명', slots: [slot('09:00')] },
  ]
  assert.equal(recommend(responses, 30)[0].count, 2)
  assert.equal(recommend(responses, 60)[0].count, 1)
  assert.deepEqual(recommend([
    { name: '동명', slots: [slot('09:00')] },
    { name: '동명', slots: [slot('09:30')] },
  ], 60), [])
})

test('continuous participants remain eligible when others join or leave', () => {
  const responses = [
    { name: '가', slots: ['09:00', '09:30', '10:00', '10:30'].map(slot) },
    { name: '나', slots: [slot('09:00'), slot('09:30')] },
  ]
  assert.equal(recommend(responses, 60)[0].count, 2)
  assert.equal(recommend(responses, 120)[0].durationMins, 120)
  assert.equal(recommend(responses, 120)[0].count, 1)
  assert.deepEqual(recommend([{ name: '가', slots: [slot('09:00'), slot('10:00')] }], 60), [])
})

const api = process.env.WHEN2MEET_TEST_API
test('API isolates same-name responses, restores ownership, and accepts explicit unavailability', { skip: !api }, async () => {
  const url = new URL(api)
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Use an isolated local API only')
  const call = (path, method = 'GET', body, headers = {}) => fetch(`${api}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const created = await call('/rooms', 'POST', { title: '응답 회귀 검증', dates: ['2099-01-01'], time_start: 9, time_end: 12 })
  assert.equal(created.status, 201)
  const room = await created.json()
  const path = `/rooms/${room.id}/availability`
  const tokenA = randomBytes(32).toString('hex')
  const tokenB = randomBytes(32).toString('hex')
  const save = (token, name, slots) => call(path, 'PUT', { name, slots }, token ? { 'x-response-token': token } : {})
  try {
    assert.equal((await save(null, '동명', [slot('09:00')])).status, 400)
    const a = await (await save(tokenA, '동명', [slot('09:00')])).json()
    const b = await (await save(tokenB, '동명', [slot('09:30')])).json()
    assert.notEqual(a.id, b.id)
    const retry = await (await save(tokenA, '동명', [slot('09:00')])).json()
    assert.equal(retry.id, a.id, 'retries update the same response')
    const updated = await (await save(tokenA, '변경한 이름', [])).json()
    assert.equal(updated.id, a.id)
    assert.deepEqual(updated.slots, [])
    const rows = await (await call(path, 'GET', undefined, { 'x-response-token': tokenA })).json()
    assert.equal(rows.length, 2)
    assert.equal(rows.filter(row => row.is_mine).length, 1)
    assert.equal(rows.find(row => row.is_mine).id, a.id)
    assert.deepEqual(rows.find(row => row.id === b.id).slots, [slot('09:30')])
    assert.ok(rows.every(row => !('response_token_hash' in row)))
    const publicRows = await (await call(path)).json()
    assert.ok(publicRows.every(row => !row.is_mine))
    for (const slots of [null, ['bad'], [slot('08:30')], ['2099-01-02|09:00']]) {
      assert.equal((await save(tokenA, '변경한 이름', slots)).status, 400)
    }
    const restored = await (await save(tokenA, '변경한 이름', [slot('09:00'), slot('09:00')])).json()
    assert.deepEqual(restored.slots, [slot('09:00')])
  } finally {
    const removed = await call(`/rooms/${room.id}`, 'DELETE', undefined, { 'x-owner-token': room.owner_token })
    assert.equal(removed.status, 204)
  }
})
