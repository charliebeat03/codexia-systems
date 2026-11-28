import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/contact.js'

function response() {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(value) { this.payload = value; return this },
  }
}

const base = {
  name: 'Cliente de prueba',
  email: 'cliente@example.com',
  service: 'Desarrollo de software',
  details: 'Necesito organizar un proceso comercial que hoy se realiza manualmente.',
  consent: true,
}

test('rechaza direcciones incompletas o con dominio inválido antes de guardar el lead', async () => {
  const invalidEmails = ['correo', 'persona@', 'persona@dominio', 'persona@dominio.c', 'persona @dominio.com', 'persona..x@dominio.com']
  for (const email of invalidEmails) {
    let backendCalls = 0
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => { backendCalls += 1; throw new Error('No debe contactar el backend') }
    try {
      const res = response()
      await handler({ method: 'POST', body: { ...base, email }, headers: {}, socket: { remoteAddress: '127.0.0.1' } }, res)
      assert.equal(res.statusCode, 400, email)
      assert.match(res.payload.error, /correo electrónico válido/i, email)
      assert.equal(backendCalls, 0, email)
    } finally {
      globalThis.fetch = originalFetch
    }
  }
})

test('acepta una dirección con formato válido y continúa la validación normal', async () => {
  const originalFetch = globalThis.fetch
  const previousUrl = process.env.SUPABASE_URL
  const previousKey = process.env.SUPABASE_SECRET_KEY
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SECRET_KEY
  try {
    const res = response()
    await handler({ method: 'POST', body: base, headers: {}, socket: { remoteAddress: '127.0.0.1' } }, res)
    assert.equal(res.statusCode, 503)
    assert.match(res.payload.error, /todavía no está conectada/i)
  } finally {
    globalThis.fetch = originalFetch
    if (previousUrl == null) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previousUrl
    if (previousKey == null) delete process.env.SUPABASE_SECRET_KEY
    else process.env.SUPABASE_SECRET_KEY = previousKey
  }
})
