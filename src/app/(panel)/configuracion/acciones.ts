'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { esHora, minutos } from '@/lib/fechas'
import { exigirAdmin, exigirSesion } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'

export interface Resultado {
  error?: string
  ok?: string
  id?: string
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
  const sesion = await exigirSesion()
  const id = String(datos.get('id') ?? '')
  if (!id) return
  const supabase = await clienteServidor()

  // Sin este chequeo se podía borrar la franja de cualquiera pasando su id;
  // lo único que lo frenaba era RLS, que al admin igual se lo permite.
  const { data: horario } = await supabase
    .from('horarios_atencion')
    .select('profesional_id')
    .eq('id', id)
    .maybeSingle()
  if (!horario) return
  if (horario.profesional_id !== sesion.perfil.id && !sesion.esAdmin) return

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
//
// Son dos niveles: la llave general del centro (abajo, del admin) y la
// de cada profesional, que decide si su propia agenda se publica. Hacen
// falta las dos, así nadie queda expuesto sin haberlo elegido (0011).
// ============================================================

/** Cada profesional decide sobre su propia agenda: no requiere ser admin. */
export async function actualizarMisReservasOnline(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const sesion = await exigirSesion()
  const acepta = datos.get('acepta') === 'si'

  const supabase = await clienteServidor()
  const { error } = await supabase
    .from('perfiles')
    .update({ acepta_reservas_online: acepta })
    .eq('id', sesion.perfil.id)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')

  if (!acepta) return { ok: 'Tu agenda ya no aparece en la página de reservas online.' }
  return {
    ok: sesion.centro.reservas_publicas
      ? 'Listo: los pacientes ya pueden reservarte turnos online.'
      : 'Guardado. Falta que se prendan las reservas online del centro para que te aparezcan.',
  }
}
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
// Vaciar mis pacientes y turnos (empezar de cero)
//
// Antes borraba los datos clínicos de TODO el centro pidiendo solo ser
// admin: en un centro compartido, cualquiera de las dueñas podía borrar
// el historial de la otra sin siquiera poder verlo (ver 0009).
// ============================================================
export async function vaciarDatosClinicos(): Promise<void> {
  await exigirSesion()
  const supabase = await clienteServidor()
  const { error } = await supabase.rpc('vaciar_mis_datos_clinicos')
  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
  redirect('/pacientes')
}
