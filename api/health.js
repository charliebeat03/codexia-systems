function getConfig() {
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '')
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null
    return { url, key }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Método no permitido.' })
  }

  const config = getConfig()
  if (!config) {
    return res.status(503).json({ ok: false, backend: 'not_configured' })
  }

  try {
    const headers = { apikey: config.key, Accept: 'application/json' }
    const options = { headers, signal: AbortSignal.timeout(5000) }
    const [profiles, leads] = await Promise.all([
      fetch(`${config.url}/rest/v1/profiles?select=id&limit=0`, options),
      fetch(`${config.url}/rest/v1/leads?select=id&limit=0`, options),
    ])
    if (!profiles.ok || !leads.ok) {
      return res.status(503).json({ ok: false, backend: 'not_ready' })
    }
    return res.status(200).json({
      ok: true,
      backend: 'connected',
      checks: { profiles: 'ok', leads: 'ok' },
    })
  } catch {
    return res.status(503).json({ ok: false, backend: 'unavailable' })
  }
}
