import { createClient } from '@supabase/supabase-js'

const allowedRoles = new Set(['client', 'team', 'admin'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clean = (value, max = 160) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)

export function isProtectedOwnerAccount(user) {
  return user?.app_metadata?.role === 'owner'
}

export function canModifyUserRole(actorRole, targetRole) {
  if (targetRole === 'owner') return false
  return actorRole === 'owner' || targetRole !== 'admin'
}

function getAdminClient() {
  const url = clean(process.env.SUPABASE_URL, 300).replace(/\/$/, '')
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
  if (req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, PATCH, DELETE')
    return response(res, 405, { error: 'Método no permitido.' })
  }

  const authorization = String(req.headers?.authorization || '')
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return response(res, 401, { error: 'Debes iniciar sesión para realizar esta operación.' })

  const admin = getAdminClient()
  if (!admin) return response(res, 503, { error: 'El servicio de administración todavía no está configurado.' })

  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) return response(res, 401, { error: 'La sesión no es válida o ha caducado.' })
  const actor = authData.user
  const actorRole = actor.app_metadata?.role
  const isOwner = actorRole === 'owner'
  const isAdmin = actorRole === 'admin' || isOwner
  if (!isAdmin) return response(res, 403, { error: 'No tienes permisos para administrar cuentas.' })

  let body
  if (typeof req.body === 'string' && Buffer.byteLength(req.body, 'utf8') > 8 * 1024) {
    return response(res, 413, { error: 'La solicitud supera el tamaño permitido.' })
  }
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {}) }
  catch { return response(res, 400, { error: 'Solicitud no válida.' }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return response(res, 400, { error: 'Solicitud no válida.' })
  }
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > 8 * 1024) {
    return response(res, 413, { error: 'La solicitud supera el tamaño permitido.' })
  }

  if (req.method === 'POST') {
    const email = clean(body.email, 160).toLowerCase()
    const displayName = clean(body.displayName, 100)
    const role = clean(body.role, 20)
    if (!emailPattern.test(email) || displayName.length < 2 || !allowedRoles.has(role)) {
      return response(res, 400, { error: 'Indica un correo válido, nombre y rol permitido.' })
    }
    if (role === 'admin' && !isOwner) return response(res, 403, { error: 'Solo el propietario puede invitar administradores.' })

    const origin = clean(process.env.PUBLIC_SITE_URL, 300).replace(/\/$/, '')
    if (!/^https:\/\//i.test(origin)) return response(res, 503, { error: 'Falta configurar PUBLIC_SITE_URL en el servidor.' })

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: displayName },
      redirectTo: `${origin.replace(/\/$/, '')}/acceso?set-password=1`,
    })
    if (error || !data.user) {
      const duplicate = /already|registered|exists/i.test(error?.message || '')
      return response(res, duplicate ? 409 : 502, { error: duplicate ? 'Ya existe una cuenta con ese correo.' : 'No se pudo enviar la invitación.' })
    }

    const { error: roleError } = await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { ...(data.user.app_metadata || {}), role },
    })
    if (roleError) {
      // Do not leave a partially configured account active if its role could not be assigned.
      await admin.auth.admin.deleteUser(data.user.id)
      return response(res, 502, { error: 'No se pudo configurar el rol. La invitación fue revertida.' })
    }

    const { error: profileError } = await admin.from('profiles').upsert({ id: data.user.id, email, display_name: displayName, role }, { onConflict: 'id' })
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id)
      return response(res, 502, { error: 'No se pudo sincronizar el perfil. La invitación fue revertida.' })
    }
    await admin.from('activity_log').insert({ actor_id: actor.id, entity_type: 'profile', entity_id: data.user.id, action: 'invited', summary: `Invitación creada para ${email} con rol ${role}` })
    return response(res, 201, { ok: true, message: 'Invitación enviada correctamente.' })
  }

  if (req.method === 'DELETE') {
    const userId = clean(body.userId, 64)
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return response(res, 400, { error: 'Usuario no válido.' })
    if (userId === actor.id) return response(res, 400, { error: 'No puedes eliminar tu propia cuenta desde esta pantalla.' })

    const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId)
    if (targetError || !targetData.user) return response(res, 404, { error: 'No se encontró la cuenta.' })
    const target = targetData.user
    const targetRole = target.app_metadata?.role || 'client'
    if (isProtectedOwnerAccount(target)) return response(res, 403, { error: 'La cuenta propietaria está protegida y no puede eliminarse desde el panel.' })
    if (!isOwner && targetRole !== 'client' && targetRole !== 'team') {
      return response(res, 403, { error: 'Los administradores solo pueden eliminar cuentas de clientes o equipo.' })
    }
    if (!['client', 'team', 'admin'].includes(targetRole)) return response(res, 403, { error: 'Este tipo de cuenta no puede eliminarse desde el panel.' })

    const { count: ownedDocumentCount, error: documentCountError } = await admin
      .from('project_documents')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', userId)
    if (documentCountError) return response(res, 502, { error: 'No se pudo comprobar si la cuenta tiene documentos asociados.' })
    if ((ownedDocumentCount || 0) > 0) {
      return response(res, 409, { error: 'Esta cuenta ha subido documentos de proyectos. Reasigna esos documentos antes de eliminarla para no perder la propiedad de los archivos.' })
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) return response(res, 502, { error: 'No se pudo eliminar la cuenta. No se modificaron sus proyectos.' })

    await admin.from('activity_log').insert({
      actor_id: actor.id,
      entity_type: 'profile',
      entity_id: userId,
      action: 'deleted',
      summary: `Cuenta eliminada: ${clean(target.email, 160)} (rol ${targetRole})`,
    })
    return response(res, 200, { ok: true, message: 'Cuenta eliminada. Los proyectos asignados se conservaron sin propietario asignado.' })
  }

  const userId = clean(body.userId, 64)
  const role = clean(body.role, 20)
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !allowedRoles.has(role)) {
    return response(res, 400, { error: 'Usuario o rol no válido.' })
  }
  if (role === 'admin' && !isOwner) return response(res, 403, { error: 'Solo el propietario puede asignar administradores.' })
  if (!isOwner && role !== 'client' && role !== 'team') return response(res, 403, { error: 'No puedes asignar ese rol.' })
  if (userId === actor.id && role !== 'owner') return response(res, 400, { error: 'No puedes cambiar tu propio rol desde esta pantalla.' })

  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId)
  if (targetError || !targetData.user) return response(res, 404, { error: 'No se encontró la cuenta.' })
  if (isProtectedOwnerAccount(targetData.user)) return response(res, 403, { error: 'Las cuentas de propietario están protegidas y no pueden modificarse desde este endpoint.' })
  if (!canModifyUserRole(actorRole, targetData.user.app_metadata?.role)) return response(res, 403, { error: 'Solo el propietario puede modificar el rol de otro administrador.' })

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(targetData.user.app_metadata || {}), role },
  })
  if (updateError) return response(res, 502, { error: 'No se pudo actualizar el rol.' })
  const { error: profileError } = await admin.from('profiles').upsert({ id: userId, email: targetData.user.email || '', display_name: targetData.user.user_metadata?.full_name || targetData.user.email || '', role }, { onConflict: 'id' })
  if (profileError) {
    await admin.auth.admin.updateUserById(userId, { app_metadata: targetData.user.app_metadata || {} })
    return response(res, 502, { error: 'No se pudo sincronizar el perfil. Se revirtió el cambio de rol.' })
  }
  await admin.from('activity_log').insert({ actor_id: actor.id, entity_type: 'profile', entity_id: userId, action: 'role_changed', summary: `Rol actualizado a ${role}` })
  return response(res, 200, { ok: true, message: 'Rol actualizado. La cuenta deberá renovar su sesión para recibir los permisos nuevos.' })
}
