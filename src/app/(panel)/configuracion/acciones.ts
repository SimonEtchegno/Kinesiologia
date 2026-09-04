'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { esHora, minutos } from '@/lib/fechas'
import { exigirAdmin, exigirSesion } from '@/lib/sesion'
import { clienteAdmin } from '@/lib/supabase/admin'
import { clienteServidor } from '@/lib/supabase/servidor'

export interface Resultado {
  error?: string
  ok?: string
  id?: string
  claveTemporal?: string
}

const ALFABETO_CLAVE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function claveTemporal(): string {
  let out = ''
  for (let i = 0; i < 8; i++) out += ALFABETO_CLAVE[Math.floor(Math.random() * ALFABETO_CLAVE.length)]
  return 'kine-' + out.slice(0, 4) + '-' + out.slice(4, 8)
}

/** `exclusion_violation` de Postgres: dos franjas u horarios que se pisan. */
function esSolape(error: { code?: string } | null): boolean {
  return error?.code === '23P01'
}

// ============================================================
// UC-09 — Horarios de atención
// ============================================================
export async function agregarHorario(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirSesion()
  const profesionalId = String(datos.get('profesional_id') ?? '') || sesion.perfil.id
  const inicio = String(datos.get('hora_inicio') ?? '')
  const fin = String(datos.get('hora_fin') ?? '')
  const sedeId = String(datos.get('sede_id') ?? '') || null
  const dias = datos.getAll('dias').map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)

  if (!sesion.esAdmin && profesionalId !== sesion.perfil.id) {
    return { error: 'Solo podés configurar tus propios horarios.' }
  }
  if (dias.length === 0) return { error: 'Elegí al menos un día.' }
  if (!esHora(inicio) || !esHora(fin)) return { error: 'Revisá las horas.' }
  if (minutos(fin) <= minutos(inicio)) return { error: 'La hora de fin tiene que ser posterior.' }

  const supabase = await clienteServidor()
  const filas = dias.map((dia) => ({
    centro_id: sesion.centro.id,
    profesional_id: profesionalId,
    sede_id: sedeId,
    dia_semana: dia,
    hora_inicio: inicio + ':00',
    hora_fin: fin + ':00',
  }))

  const { error } = await supabase.from('horarios_atencion').insert(filas)
  if (error) {
    if (esSolape(error)) return { error: 'Esa franja se superpone con otra que ya tenés cargada.' }
    return { error: error.message }
  }

  revalidatePath('/configuracion/horarios')
  return { ok: 'Franja agregada.' }
}

export async function borrarHorario(datos: FormData): Promise<void> {
  const id = String(datos.get('id') ?? '')
  if (!id) return
  const supabase = await clienteServidor()
  await supabase.from('horarios_atencion').delete().eq('id', id)
  revalidatePath('/configuracion/horarios')
}

// ============================================================
// Mis datos
// ============================================================
export async function actualizarMisDatos(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirSesion()
  const nombre = String(datos.get('nombre') ?? '').trim()
  if (!nombre) return { error: 'El nombre no puede quedar vacío.' }

  const supabase = await clienteServidor()
  const { error } = await supabase
    .from('perfiles')
    .update({
      nombre,
      especialidad: String(datos.get('especialidad') ?? '').trim() || null,
      telefono: String(datos.get('telefono') ?? '').trim() || null,
    })
    .eq('id', sesion.perfil.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return { ok: 'Datos actualizados.' }
}

// ============================================================
// Contraseña
// ============================================================
export async function cambiarClave(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirSesion()
  const nueva = String(datos.get('nueva') ?? '')
  const repetir = String(datos.get('repetir') ?? '')

  if (nueva.length < 8) return { error: 'La contraseña tiene que tener al menos 8 caracteres.' }
  if (nueva !== repetir) return { error: 'Las dos contraseñas no coinciden.' }

  const supabase = await clienteServidor()
  const { error } = await supabase.auth.updateUser({ password: nueva })
  if (error) return { error: error.message }

  if (sesion.perfil.debe_cambiar_password) {
    await supabase.from('perfiles').update({ debe_cambiar_password: false }).eq('id', sesion.perfil.id)
  }

  revalidatePath('/', 'layout')
  return { ok: 'Contraseña actualizada.' }
}

// ============================================================
// UC-10 — Dar de alta un kinesiólogo
// ============================================================
export async function crearProfesional(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const { centro } = await exigirAdmin()

  const nombre = String(datos.get('nombre') ?? '').trim()
  const email = String(datos.get('email') ?? '').trim().toLowerCase()
  const especialidad = String(datos.get('especialidad') ?? '').trim() || null
  const telefono = String(datos.get('telefono') ?? '').trim() || null
  const rol = String(datos.get('rol') ?? 'kinesiologo') === 'admin' ? 'admin' : 'kinesiologo'

  if (!nombre) return { error: 'Poné el nombre del profesional.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El email no parece válido.' }

  const clave = claveTemporal()

  // centro_id sale de la sesión del admin que está pidiendo el alta, nunca
  // del formulario: es lo que impide que alguien cuele un perfil en el
  // centro de otro (ver trigger handle_new_user, PARTE 3 de la migración).
  const { data, error } = await clienteAdmin().auth.admin.createUser({
    email,
    password: clave,
    email_confirm: true,
    app_metadata: {
      centro_id: centro.id,
      rol,
      nombre,
      especialidad,
      telefono,
      debe_cambiar_password: true,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already been registered')) {
      return { error: 'Ya existe una cuenta con ese email.' }
    }
    return { error: error.message }
  }

  revalidatePath('/configuracion/profesionales')
  return { ok: nombre + ' ya tiene cuenta y agenda propia.', claveTemporal: clave, id: data.user?.id }
}

export async function cambiarActivoProfesional(datos: FormData): Promise<void> {
  const sesion = await exigirAdmin()
  const id = String(datos.get('id') ?? '')
  const activo = datos.get('activo') === 'si'
  if (!id || id === sesion.perfil.id) return

  const supabase = await clienteServidor()
  await supabase.from('perfiles').update({ activo }).eq('id', id)
  revalidatePath('/configuracion/profesionales')
}

/** El admin no puede cambiarse el rol a sí mismo: se quedaría afuera del panel. */
export async function cambiarRolProfesional(datos: FormData): Promise<void> {
  const sesion = await exigirAdmin()
  const id = String(datos.get('id') ?? '')
  const rol = String(datos.get('rol') ?? '') === 'admin' ? 'admin' : 'kinesiologo'
  if (!id || id === sesion.perfil.id) return

  const supabase = await clienteServidor()
  await supabase.from('perfiles').update({ rol }).eq('id', id)
  revalidatePath('/configuracion/profesionales')
}

// ============================================================
// Sedes
// ============================================================
export async function crearSede(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirAdmin()
  const nombre = String(datos.get('nombre') ?? '').trim()
  const direccion = String(datos.get('direccion') ?? '').trim() || null

  if (!nombre) return { error: 'Poné el nombre de la sede.' }

  const supabase = await clienteServidor()
  const { data, error } = await supabase
    .from('sedes')
    .insert({ centro_id: sesion.centro.id, nombre, direccion })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/configuracion/sedes')
  return { ok: 'Sede creada.', id: data.id }
}

export async function cambiarActivaSede(datos: FormData): Promise<void> {
  await exigirAdmin()
  const id = String(datos.get('id') ?? '')
  const activa = datos.get('activa') === 'si'
  if (!id) return

  const supabase = await clienteServidor()
  await supabase.from('sedes').update({ activa }).eq('id', id)
  revalidatePath('/configuracion/sedes')
}

// ============================================================
// Datos del centro
// ============================================================
export async function actualizarCentro(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirAdmin()
  const nombre = String(datos.get('nombre') ?? '').trim()
  const telefono = String(datos.get('telefono') ?? '').trim() || null
  const duracion = Number(datos.get('duracion_turno_min') ?? 45)
  const permite = datos.get('kinesiologos_pueden_crear_turnos') === 'si'

  if (!nombre) return { error: 'El nombre del centro no puede quedar vacío.' }
  if (!Number.isInteger(duracion) || duracion < 10 || duracion > 240) {
    return { error: 'La duración por defecto tiene que estar entre 10 y 240 minutos.' }
  }

  const supabase = await clienteServidor()
  const { error } = await supabase
    .from('centros')
    .update({
      nombre,
      telefono,
      duracion_turno_min: duracion,
      kinesiologos_pueden_crear_turnos: permite,
    })
    .eq('id', sesion.centro.id)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { ok: 'Datos del centro actualizados.' }
}

// ============================================================
// Turnos online (página pública de reservas)
// ============================================================
export async function actualizarReservas(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirAdmin()
  const activas = datos.get('reservas') === 'si'

  const supabase = await clienteServidor()
  const { error } = await supabase
    .from('centros')
    .update({ reservas_publicas: activas })
    .eq('id', sesion.centro.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return {
    ok: activas
      ? 'Los pacientes ya pueden sacar turno desde la página pública.'
      : 'Listo: la página pública quedó cerrada. Los turnos los cargás solo vos.',
  }
}

// ============================================================
// WhatsApp automático al cargar un turno
// ============================================================
export async function actualizarWhatsapp(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirAdmin()
  const activo = datos.get('whatsapp_ingreso') === 'si'

  const supabase = await clienteServidor()
  const { error } = await supabase
    .from('centros')
    .update({ whatsapp_ingreso_automatico: activo })
    .eq('id', sesion.centro.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return {
    ok: activo
      ? 'Al cargar un turno te vamos a ofrecer el WhatsApp de aviso.'
      : 'Listo: el WhatsApp ya no se ofrece solo. Igual lo tenés a mano en cada turno.',
  }
}

// ============================================================
// Vaciar pacientes y turnos (empezar de cero)
// ============================================================
export async function vaciarDatosClinicos(): Promise<void> {
  const sesion = await exigirAdmin()
  const supabase = await clienteServidor()
  const { error } = await supabase.rpc('vaciar_datos_clinicos', { p_centro_id: sesion.centro.id })
  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
  redirect('/pacientes')
}
