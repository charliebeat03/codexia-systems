import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/contact.js'

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
}

function createRequest({ method = 'POST', body = {}, headers = {} } = {}) {
  return { method, body, headers, socket: { remoteAddress: '203.0.113.10' } }
}

function validBody(overrides = {}) {
  return {
    name: 'Cliente de prueba',
    email: 'cliente@example.com',
    service: 'Desarrollo de software',
    details: 'Necesito organizar un proceso comercial que hoy se realiza manualmente.',
    consent: true,
    ...overrides,
  }
}

async function withEnvironment(values, run) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  for (const [key, value] of Object.entries(values)) {
    if (value == null) delete process.env[key]
    else process.env[key] = value
  }
  try { await run() }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key]
      else process.env[key] = value
    }
    globalThis.fetch = originalFetch
  }
}

test('rechaza métodos distintos de POST', async () => {
  await withEnvironment({}, async () => {
    const res = createResponse()
    await handler(createRequest({ method: 'GET' }), res)
    assert.equal(res.statusCode, 405)
    assert.equal(res.headers.Allow, 'POST')
  })
})

test('el honeypot responde sin contactar el backend', async () => {
  await withEnvironment({}, async () => {
    let calls = 0
    globalThis.fetch = async () => { calls += 1; throw new Error('No debería llamar al backend') }
    const res = createResponse()
    await handler(createRequest({ body: validBody({ website: 'bot-filled-this' }) }), res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.payload, { ok: true })
    assert.equal(calls, 0)
  })
})

test('rechaza datos inválidos y consentimiento ausente', async () => {
  await withEnvironment({}, async () => {
    const res = createResponse()
    await handler(createRequest({ body: validBody({ consent: false }) }), res)
    assert.equal(res.statusCode, 400)
    assert.match(res.payload.error, /campos obligatorios/i)
  })
})

test('falla de forma clara si el CRM no está configurado', async () => {
  await withEnvironment({ SUPABASE_URL: null, SUPABASE_SECRET_KEY: null, SUPABASE_SERVICE_ROLE_KEY: null }, async () => {
    const res = createResponse()
    await handler(createRequest({ body: validBody() }), res)
    assert.equal(res.statusCode, 503)
    assert.match(res.payload.error, /todavía no está conectada/i)
  })
})

test('aplica el rate limit y guarda el lead antes de notificar', async () => {
  await withEnvironment({
    SUPABASE_URL: 'https://codexia-test.supabase.co',
    SUPABASE_SECRET_KEY: 'test-secret-only',
    SUPABASE_SERVICE_ROLE_KEY: null,
    MAILJET_API_KEY: null, MAILJET_SECRET_KEY: null,
    CONTACT_TO_EMAIL: null,
    CONTACT_CC_EMAIL: null,
    CONTACT_FROM_EMAIL: null,
  }, async () => {
    const calls = []
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options })
      if (String(url).includes('/rpc/consume_contact_rate_limit')) return new Response('true', { status: 200 })
      if (String(url).endsWith('/rest/v1/leads')) return new Response(null, { status: 201 })
      throw new Error(`URL inesperada: ${url}`)
    }
    const res = createResponse()
    await handler(createRequest({ body: validBody(), headers: { 'x-forwarded-for': '203.0.113.10' } }), res)
    assert.equal(res.statusCode, 201)
    assert.equal(res.payload.ok, true)
    assert.deepEqual(res.payload.notification, { team: 'not_configured', customer: 'not_configured' })
    assert.equal(calls.length, 2)
    const limitBody = JSON.parse(calls[0].options.body)
    assert.match(limitBody.p_ip_hash, /^[a-f0-9]{64}$/)
    assert.equal(calls[1].options.method, 'POST')
    const savedLead = JSON.parse(calls[1].options.body)
    assert.equal(savedLead.email, 'cliente@example.com')
    assert.equal(savedLead.source, 'website')
    assert.equal('ip' in savedLead, false)
  })
})

test('detiene la solicitud cuando el rate limit no permite otro envío', async () => {
  await withEnvironment({ SUPABASE_URL: 'https://codexia-test.supabase.co', SUPABASE_SECRET_KEY: 'test-secret-only', SUPABASE_SERVICE_ROLE_KEY: null }, async () => {
    let calls = 0
    globalThis.fetch = async () => { calls += 1; return new Response('false', { status: 200 }) }
    const res = createResponse()
    await handler(createRequest({ body: validBody() }), res)
    assert.equal(res.statusCode, 429)
    assert.equal(calls, 1)
  })
})

test('falla de forma cerrada si no puede comprobar el rate limit', async () => {
  await withEnvironment({ SUPABASE_URL: 'https://codexia-test.supabase.co', SUPABASE_SECRET_KEY: 'test-secret-only', SUPABASE_SERVICE_ROLE_KEY: null }, async () => {
    globalThis.fetch = async () => new Response('unavailable', { status: 500 })
    const res = createResponse()
    await handler(createRequest({ body: validBody() }), res)
    assert.equal(res.statusCode, 502)
    assert.match(res.payload.error, /protección antispam/i)
  })
})

test('rechaza cuerpos excesivamente grandes', async () => {
  await withEnvironment({}, async () => {
    const res = createResponse()
    await handler(createRequest({ body: validBody({ details: 'x'.repeat(13000) }) }), res)
    assert.equal(res.statusCode, 413)
    assert.match(res.payload.error, /tamaño permitido/i)
  })
})

test('conserva el lead aunque falle la notificación de Mailjet', async () => {
  await withEnvironment({
    SUPABASE_URL: 'https://codexia-test.supabase.co',
    SUPABASE_SECRET_KEY: 'test-secret-only',
    SUPABASE_SERVICE_ROLE_KEY: null,
    MAILJET_API_KEY: 'api-test-only', MAILJET_SECRET_KEY: 'secret-test-only',
    CONTACT_TO_EMAIL: 'team@example.com',
    CONTACT_CC_EMAIL: 'contact@codexiasystems.dpdns.org',
    CONTACT_FROM_EMAIL: 'Codexia <noreply@example.com>',
  }, async () => {
    const calls = []
    globalThis.fetch = async (url) => {
      calls.push(String(url))
      if (String(url).includes('/rpc/consume_contact_rate_limit')) return new Response('true', { status: 200 })
      if (String(url).endsWith('/rest/v1/leads')) return new Response(null, { status: 201 })
      if (String(url) === 'https://api.mailjet.com/v3.1/send') return new Response('mail provider unavailable', { status: 503 })
      throw new Error(`URL inesperada: ${url}`)
    }
    const res = createResponse()
    await handler(createRequest({ body: validBody() }), res)
    assert.equal(res.statusCode, 201)
    assert.equal(res.payload.ok, true)
    assert.deepEqual(res.payload.notification, { team: 'failed', customer: 'failed' })
    assert.equal(calls.length, 4)
    assert.ok(calls[1].endsWith('/rest/v1/leads'))
    assert.equal(calls[2], 'https://api.mailjet.com/v3.1/send')
    assert.equal(calls[3], 'https://api.mailjet.com/v3.1/send')
  })
})

test('envía confirmación al cliente y aviso al equipo cuando el correo está configurado', async () => {
  await withEnvironment({
    SUPABASE_URL: 'https://codexia-test.supabase.co',
    SUPABASE_SECRET_KEY: 'test-secret-only',
    SUPABASE_SERVICE_ROLE_KEY: null,
    MAILJET_API_KEY: 'api-test-only', MAILJET_SECRET_KEY: 'secret-test-only',
    CONTACT_TO_EMAIL: 'team@example.com',
    CONTACT_CC_EMAIL: 'contact@codexiasystems.dpdns.org',
    CONTACT_FROM_EMAIL: 'Codexia <noreply@example.com>',
  }, async () => {
    const emails = []
    globalThis.fetch = async (url, options) => {
      if (String(url).includes('/rpc/consume_contact_rate_limit')) return new Response('true', { status: 200 })
      if (String(url).endsWith('/rest/v1/leads')) return new Response(null, { status: 201 })
      if (String(url) === 'https://api.mailjet.com/v3.1/send') {
        emails.push({ body: JSON.parse(options.body), headers: options.headers })
        return new Response(JSON.stringify({ Messages: [{ Status: 'success' }] }), { status: 200 })
      }
      throw new Error('URL inesperada: ' + url)
    }
    const res = createResponse()
    await handler(createRequest({ body: validBody() }), res)
    assert.equal(res.statusCode, 201)
    assert.deepEqual(res.payload.notification, { team: 'sent', customer: 'sent' })
    assert.match(res.payload.message, /1 a 3 días hábiles/i)
    assert.equal(emails.length, 2)
    const internalMail = emails.find(mail => mail.body.Messages[0].Subject.startsWith('Nueva solicitud'))?.body.Messages[0]
    const customerMail = emails.find(mail => mail.body.Messages[0].To[0].Email === 'cliente@example.com')?.body.Messages[0]
    assert.deepEqual(internalMail.To.map(recipient => recipient.Email).sort(), ['contact@codexiasystems.dpdns.org', 'team@example.com'])
    assert.equal(customerMail.To[0].Email, 'cliente@example.com')
    assert.ok(emails.every(mail => mail.headers.Authorization === `Basic ${Buffer.from('api-test-only:secret-test-only').toString('base64')}`))
    assert.match(customerMail.HTMLPart, /Hemos recibido tu solicitud/)
    assert.match(customerMail.TextPart, /1 y 3 días hábiles|1 a 3 días hábiles/)
  })
})

test('rechaza cuerpos JSON que no son objetos', async () => {
  await withEnvironment({}, async () => {
    for (const body of ['null', '"texto"', '[]']) {
      const res = createResponse()
      await handler(createRequest({ body }), res)
      assert.equal(res.statusCode, 400)
      assert.match(res.payload.error, /solicitud no válida/i)
    }
  })
})
