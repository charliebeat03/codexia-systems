import test from 'node:test'
import assert from 'node:assert/strict'
import handler, { isProtectedOwnerAccount } from '../api/admin/users.js'

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

test('owner protection reads app_metadata, not editable user_metadata', () => {
  assert.equal(isProtectedOwnerAccount({ app_metadata: { role: 'owner' } }), true)
  assert.equal(isProtectedOwnerAccount({ user_metadata: { role: 'owner' } }), false)
  assert.equal(isProtectedOwnerAccount({ app_metadata: { role: 'admin' }, user_metadata: { role: 'owner' } }), false)
  assert.equal(isProtectedOwnerAccount(null), false)
})

test('admin users endpoint rejects unsupported HTTP methods', async () => {
  const res = createResponse()
  await handler({ method: 'GET', headers: {} }, res)
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers.Allow, 'POST, PATCH')
})

test('admin users endpoint requires a bearer token', async () => {
  const res = createResponse()
  await handler({ method: 'PATCH', headers: {} }, res)
  assert.equal(res.statusCode, 401)
  assert.match(res.payload.error, /iniciar sesión/i)
})
