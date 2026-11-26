import { createClient } from '@supabase/supabase-js'

const clean = (value, max = 160) => String(value ?? '').replace(/[\\u0000-\\u001f\\u007f]/g, ' ').trim().slice(0, max)
const uuidPattern = /^[0-9a-f-]{36}$/i

function getAdminClient() {
  const url = clean(process.env.SUPABASE_URL, 300).replace(/\\/$/, '')
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
  } catch { return null }
}

function response(res, status, payload) {
  return res.status(status).json(payload)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return response(res, 405, { error: 'Método no permitido.' })
  }

  const token = String(req.headers?.authorization || '').match(/^Bearer\\s+(.+)$/i)?.[1]
  if (!token) return response(res, 401, { error: 'Debes iniciar sesión para realizar esta operación.' })

  const admin = getAdminClient()
  if (!admin) return response(res, 503, { error: 'El servicio de administración todavía no está configurado.' })

  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) return response(res, 401, { error: 'La sesión no es válida o ha caducado.' })
  const actor = authData.user
  const role = actor.app_metadata?.role
  if (role !== 'owner' && role !== 'admin') return response(res, 403, { error: 'Solo administración puede eliminar proyectos.' })

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {}) }
  catch { return response(res, 400, { error: 'Solicitud no válida.' }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return response(res, 400, { error: 'Solicitud no válida.' })
  const projectId = clean(body.projectId, 64)
  if (!uuidPattern.test(projectId)) return response(res, 400, { error: 'Proyecto no válido.' })

  const { data: project, error: projectError } = await admin.from('projects').select('id,name').eq('id', projectId).maybeSingle()
  if (projectError) return response(res, 502, { error: 'No se pudo comprobar el proyecto.' })
  if (!project) return response(res, 404, { error: 'El proyecto ya no existe.' })

  const { error: deleteError } = await admin.from('projects').delete().eq('id', projectId)
  if (deleteError) return response(res, 502, { error: 'No se pudo eliminar el proyecto. Sus documentos se conservaron.' })

  const { data: objects, error: listError } = await admin.storage.from('project-documents').list(projectId, { limit: 1000 })
  let storageWarning = null
  if (listError) {
    storageWarning = 'El proyecto y sus registros se eliminaron, pero no se pudo revisar el almacenamiento. Hay que comprobar posibles archivos huérfanos.'
  } else {
    const paths = (objects || []).filter(item => item.name && item.id).map(item => `${projectId}/${item.name}`)
    if (paths.length) {
      const { error: removeError } = await admin.storage.from('project-documents').remove(paths)
      if (removeError) storageWarning = 'El proyecto se eliminó, pero algunos archivos podrían permanecer en el almacenamiento y requieren limpieza.'
    }
  }

  await admin.from('activity_log').insert({
    actor_id: actor.id,
    entity_type: 'project',
    entity_id: projectId,
    action: 'deleted',
    summary: `Proyecto eliminado: ${clean(project.name, 120)}`,
  })

  return response(res, 200, {
    ok: true,
    message: storageWarning || 'Proyecto y documentos eliminados correctamente.',
    storageCleanupPending: Boolean(storageWarning),
  })
}
