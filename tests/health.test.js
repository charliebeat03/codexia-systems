import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/health.js'

function response() {
  return { statusCode: 200, headers: {}, payload: null, setHeader(k,v){this.headers[k]=v}, status(code){this.statusCode=code;return this}, json(value){this.payload=value;return this} }
}

test('health solo acepta GET', async () => {
  const res = response()
  await handler({ method: 'POST' }, res)
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers.Allow, 'GET')
})

test('health informa cuando faltan variables privadas', async () => {
  const previous = [process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY]
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SECRET_KEY
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const res = response()
    await handler({ method: 'GET' }, res)
    assert.equal(res.statusCode, 503)
    assert.equal(res.payload.backend, 'not_configured')
  } finally {
    for (const [key, value] of [['SUPABASE_URL',previous[0]],['SUPABASE_SECRET_KEY',previous[1]],['SUPABASE_SERVICE_ROLE_KEY',previous[2]]]) {
      if (value == null) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('health comprueba las tablas principales sin devolver datos', async () => {
  const previous = [process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY]
  process.env.SUPABASE_URL = 'https://codexia-test.supabase.co'
  process.env.SUPABASE_SECRET_KEY = 'test-secret-only'
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  const originalFetch = globalThis.fetch
  const urls = []
  globalThis.fetch = async url => { urls.push(String(url)); return new Response('[]', { status: 200 }) }
  try {
    const res = response()
    await handler({ method: 'GET' }, res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.payload.backend, 'connected')
    assert.deepEqual(res.payload.checks, { profiles: 'ok', leads: 'ok' })
    assert.equal(urls.length, 2)
    assert.ok(urls.some(url => url.includes('/profiles?select=id&limit=0')))
    assert.ok(urls.some(url => url.includes('/leads?select=id&limit=0')))
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of [['SUPABASE_URL',previous[0]],['SUPABASE_SECRET_KEY',previous[1]],['SUPABASE_SERVICE_ROLE_KEY',previous[2]]]) {
      if (value == null) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('health informa cuando una tabla principal no está disponible', async () => {
  const previous = [process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY]
  process.env.SUPABASE_URL = 'https://codexia-test.supabase.co'
  process.env.SUPABASE_SECRET_KEY = 'test-secret-only'
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  const originalFetch = globalThis.fetch
  let count = 0
  globalThis.fetch = async () => { count += 1; return new Response('unavailable', { status: count === 1 ? 200 : 503 }) }
  try {
    const res = response()
    await handler({ method: 'GET' }, res)
    assert.equal(res.statusCode, 503)
    assert.equal(res.payload.backend, 'not_ready')
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of [['SUPABASE_URL',previous[0]],['SUPABASE_SECRET_KEY',previous[1]],['SUPABASE_SERVICE_ROLE_KEY',previous[2]]]) {
      if (value == null) delete process.env[key]
      else process.env[key] = value
    }
  }
})
