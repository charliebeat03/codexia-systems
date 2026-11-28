import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/admin/projects.js'

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
}

test('admin projects endpoint only accepts DELETE', async () => {
  const res = createResponse()
  await handler({ method: 'GET', headers: {} }, res)
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers.Allow, 'DELETE')
})

test('admin projects endpoint requires a bearer token', async () => {
  const res = createResponse()
  await handler({ method: 'DELETE', headers: {}, body: { projectId: '00000000-0000-4000-8000-000000000000' } }, res)
  assert.equal(res.statusCode, 401)
  assert.match(res.payload.error, /iniciar sesión/i)
})
