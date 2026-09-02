import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Centro, Perfil } from './dominio'
import { clienteServidor } from './supabase/servidor'

export interface Sesion {
  perfil: Perfil
  centro: Centro
  esAdmin: boolean
  /** UC-03: si es kinesiólogo, ¿el centro lo habilita a cargar turnos? */
  puedeCargarTurnos: boolean
}

/**
 * Sesión del usuario logueado, con su perfil y su centro.
 * Envuelta en cache() para resolverse una sola vez por request,
 * aunque la pidan el layout y la página.
 */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const supabase = await clienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const respuesta = await supabase
    .from('perfiles')
    .select(
      'id, centro_id, nombre, email, rol, especialidad, telefono, activo, debe_cambiar_password, ' +
        'centro:centros(id, nombre, kinesiologos_pueden_crear_turnos, duracion_turno_min, ' +
        'reservas_publicas, whatsapp_ingreso_automatico, telefono)',
    )
    .eq('id', user.id)
    .maybeSingle()

  // Sin tipos generados de la base, Supabase no puede inferir la forma de la fila.
  const data = respuesta.data as unknown as
    | (Perfil & { centro: Centro | Centro[] | null })
    | null

  if (!data || !data.activo) return null

  // La relación puede venir como objeto o como array de uno; normalizamos.
  const centro = Array.isArray(data.centro) ? data.centro[0] : data.centro
  if (!centro) return null

  const perfil: Perfil = {
    id: data.id,
    centro_id: data.centro_id,
    nombre: data.nombre,
    email: data.email,
    rol: data.rol,
    especialidad: data.especialidad,
    telefono: data.telefono,
    activo: data.activo,
    debe_cambiar_password: data.debe_cambiar_password,
  }

  const esAdmin = perfil.rol === 'admin'

  return {
    perfil,
    centro,
    esAdmin,
    puedeCargarTurnos: esAdmin || centro.kinesiologos_pueden_crear_turnos,
  }
})

/** Para páginas del panel: si no hay sesión, al login. */
export async function exigirSesion(): Promise<Sesion> {
  const sesion = await obtenerSesion()
  if (!sesion) {
    const supabase = await clienteServidor()
    await supabase.auth.signOut()
    redirect('/login?error=' + encodeURIComponent('Tu usuario no tiene un centro asignado en la base de datos. Ejecutá el SQL de inicialización en Supabase.'))
  }
  return sesion
}

/** Para pantallas de administración (UC-10, UC-11, UC-12). */
export async function exigirAdmin(): Promise<Sesion> {
  const sesion = await exigirSesion()
  if (!sesion.esAdmin) redirect('/agenda')
  return sesion
}
