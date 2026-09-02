'use server'

import { revalidatePath } from 'next/cache'
import type { EstadoTurno } from '@/lib/dominio'
import { desdeMinutos, esHora, esISO, hhmm, minutos, yaPaso } from '@/lib/fechas'
import {
  estaEnHorarioDeAtencion,
  hayChoque,
  observacionDeTurno,
  turnoPorId,
  type Cliente,
} from '@/lib/datos'
import { exigirSesion } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'

export interface Resultado {
  error?: string
  ok?: string
  id?: string
}

/** `exclusion_violation` de Postgres: turnos_sin_solape lo agarró en la carrera. */
function esSolape(error: { code?: string } | null): boolean {
  return error?.code === '23P01'
}

async function agregarEvento(
  supabase: Cliente,
  centroId: string,
  turnoId: string,
  tipo: string,
  detalle: string | null,
  usuarioId: string,
) {
  await supabase
    .from('turno_eventos')
    .insert({ centro_id: centroId, turno_id: turnoId, tipo, detalle, usuario_id: usuarioId })
}

// ============================================================
// UC-03 — Registrar un turno
// ============================================================
export async function crearTurno(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirSesion()
  const supabase = await clienteServidor()

  const profesionalId = String(datos.get('profesional_id') ?? '')
  const fecha = String(datos.get('fecha') ?? '')
  const horaInicio = String(datos.get('hora_inicio') ?? '')
  const duracion = Number(datos.get('duracion') ?? sesion.centro.duracion_turno_min)
  const tipoSesion = String(datos.get('tipo_sesion') ?? '').trim() || 'Kinesiología'
  const sedeId = String(datos.get('sede_id') ?? '') || null
  const forzar = datos.get('forzar_fuera_de_horario') === 'si'

  let pacienteId = String(datos.get('paciente_id') ?? '')

  if (!sesion.esAdmin) {
    if (!sesion.centro.kinesiologos_pueden_crear_turnos) {
      return { error: 'En este centro los turnos los carga el administrador.' }
    }
    if (profesionalId !== sesion.perfil.id) {
      return { error: 'Solo podés cargar turnos en tu propia agenda.' }
    }
  }

  if (!profesionalId) return { error: 'Elegí el profesional que va a atender.' }
  if (!esISO(fecha)) return { error: 'La fecha no es válida.' }
  if (!esHora(horaInicio)) return { error: 'El horario no es válido.' }
  if (!Number.isFinite(duracion) || duracion < 10 || duracion > 240) {
    return { error: 'La duración tiene que estar entre 10 y 240 minutos.' }
  }

  // Precondición de UC-03: el paciente ya existe, o se da de alta en el mismo paso.
  if (pacienteId === '__nuevo') {
    const nombre = String(datos.get('nuevo_nombre') ?? '').trim()
    const apellido = String(datos.get('nuevo_apellido') ?? '').trim()
    const telefono = String(datos.get('nuevo_telefono') ?? '').trim() || null
    const cobertura = String(datos.get('nuevo_cobertura') ?? 'particular') as 'particular' | 'obra_social'
    const obraSocial = String(datos.get('nuevo_obra_social') ?? '').trim() || null

    if (!nombre || !apellido) return { error: 'Para dar de alta al paciente hace falta nombre y apellido.' }
    if (cobertura === 'obra_social' && !obraSocial) return { error: 'Indicá la obra social del paciente.' }

    const { data, error } = await supabase
      .from('pacientes')
      .insert({
        centro_id: sesion.centro.id,
        nombre,
        apellido,
        telefono,
        cobertura,
        obra_social: cobertura === 'obra_social' ? obraSocial : null,
      })
      .select('id')
      .single()

    if (error || !data) return { error: error?.message ?? 'No se pudo dar de alta al paciente.' }
    pacienteId = data.id
  }

  if (!pacienteId) return { error: 'Elegí el paciente.' }

  const horaFin = desdeMinutos(minutos(horaInicio) + duracion)
  if (minutos(horaFin) > 24 * 60) return { error: 'El turno no puede pasar de la medianoche.' }

  const enHorario = await estaEnHorarioDeAtencion(supabase, profesionalId, fecha, horaInicio, horaFin)
  if (!enHorario && !forzar) {
    return {
      error:
        'Ese horario queda fuera de las franjas de atención del profesional. Elegí otro, o confirmá que querés cargarlo igual.',
    }
  }

  const choque = await hayChoque(supabase, profesionalId, fecha, horaInicio, horaFin)
  if (choque) {
    return {
      error:
        'Ese horario ya está ocupado (' +
        choque.hora_inicio.slice(0, 5) +
        '–' +
        choque.hora_fin.slice(0, 5) +
        '). Elegí otro horario.',
    }
  }

  const { data: turno, error } = await supabase
    .from('turnos')
    .insert({
      centro_id: sesion.centro.id,
      profesional_id: profesionalId,
      paciente_id: pacienteId,
      sede_id: sedeId,
      fecha,
      hora_inicio: horaInicio + ':00',
      hora_fin: horaFin + ':00',
      tipo_sesion: tipoSesion,
      estado: 'confirmado',
      origen: 'centro',
      created_by: sesion.perfil.id,
    })
    .select('id')
    .single()

  if (error || !turno) {
    if (esSolape(error)) return { error: 'Ese horario ya está ocupado. Elegí otro horario.' }
    return { error: error?.message ?? 'No se pudo crear el turno.' }
  }

  await agregarEvento(
    supabase,
    sesion.centro.id,
    turno.id,
    'creado',
    fecha + ' ' + horaInicio + '–' + horaFin + (enHorario ? '' : ' (fuera de horario)'),
    sesion.perfil.id,
  )

  revalidatePath('/agenda')
  return { ok: 'Turno creado.', id: turno.id }
}

// ============================================================
// UC-04 — Reprogramar
// ============================================================
export async function reprogramarTurno(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirSesion()
  const supabase = await clienteServidor()

  const turnoId = String(datos.get('turno_id') ?? '')
  const fecha = String(datos.get('fecha') ?? '')
  const horaInicio = String(datos.get('hora_inicio') ?? '')
  const forzar = datos.get('forzar_fuera_de_horario') === 'si'

  if (!esISO(fecha) || !esHora(horaInicio)) return { error: 'Revisá la fecha y el horario.' }

  const turno = await turnoPorId(supabase, turnoId)
  if (!turno) return { error: 'No encontramos el turno.' }
  if (['realizado', 'ausente', 'cancelado'].includes(turno.estado)) {
    return { error: 'Este turno ya está cerrado: no se puede reprogramar.' }
  }
  if (!sesion.esAdmin && turno.profesional_id !== sesion.perfil.id) {
    return { error: 'Solo el profesional del turno o el administrador pueden modificarlo.' }
  }

  const duracion = minutos(turno.hora_fin) - minutos(turno.hora_inicio)
  const horaFin = desdeMinutos(minutos(horaInicio) + duracion)
  if (fecha === turno.fecha && horaInicio === turno.hora_inicio.slice(0, 5)) {
    return { error: 'Es el mismo horario que ya tenía.' }
  }

  const enHorario = await estaEnHorarioDeAtencion(supabase, turno.profesional_id, fecha, horaInicio, horaFin)
  if (!enHorario && !forzar) {
    return {
      error:
        'Ese horario queda fuera de las franjas de atención del profesional. Elegí otro, o confirmá que querés reprogramarlo igual.',
    }
  }

  const choque = await hayChoque(supabase, turno.profesional_id, fecha, horaInicio, horaFin, turno.id)
  if (choque) {
    return {
      error:
        'Ese horario ya está ocupado (' + choque.hora_inicio.slice(0, 5) + '–' + choque.hora_fin.slice(0, 5) + ').',
    }
  }

  const { error } = await supabase
    .from('turnos')
    .update({
      fecha,
      hora_inicio: horaInicio + ':00',
      hora_fin: horaFin + ':00',
      estado: 'reprogramado',
    })
    .eq('id', turno.id)

  if (error) {
    if (esSolape(error)) return { error: 'Ese horario ya está ocupado.' }
    return { error: error.message }
  }

  await agregarEvento(
    supabase,
    sesion.centro.id,
    turno.id,
    'reprogramado',
    'A ' + fecha + ' ' + horaInicio + (enHorario ? '' : ' (fuera de horario)'),
    sesion.perfil.id,
  )

  revalidatePath('/agenda')
  revalidatePath('/turnos/' + turno.id)
  return { ok: 'Turno reprogramado.' }
}

// ============================================================
// UC-04 — Cancelar
// ============================================================
export async function cancelarTurno(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirSesion()
  const supabase = await clienteServidor()

  const turnoId = String(datos.get('turno_id') ?? '')
  const motivo = String(datos.get('motivo') ?? '').trim()

  const turno = await turnoPorId(supabase, turnoId)
  if (!turno) return { error: 'No encontramos el turno.' }
  if (['realizado', 'ausente', 'cancelado'].includes(turno.estado)) {
    return { error: 'Este turno ya está cerrado: no se puede cancelar.' }
  }
  if (!sesion.esAdmin && turno.profesional_id !== sesion.perfil.id) {
    return { error: 'Solo el profesional del turno o el administrador pueden cancelarlo.' }
  }

  const { error } = await supabase
    .from('turnos')
    .update({ estado: 'cancelado', motivo: motivo || null })
    .eq('id', turno.id)
  if (error) return { error: error.message }

  await agregarEvento(supabase, sesion.centro.id, turno.id, 'cancelado', motivo || null, sesion.perfil.id)

  revalidatePath('/agenda')
  revalidatePath('/turnos/' + turno.id)
  return { ok: 'Turno cancelado.' }
}

// ============================================================
// Tipo de sesión — corregir el de un turno ya cargado
// ============================================================
export async function cambiarTipoSesion(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirSesion()
  const supabase = await clienteServidor()

  const turnoId = String(datos.get('turno_id') ?? '')
  const tipoSesion = String(datos.get('tipo_sesion') ?? '').trim()

  const turno = await turnoPorId(supabase, turnoId)
  if (!turno) return { error: 'No encontramos el turno.' }
  if (turno.estado === 'cancelado') return { error: 'El turno está cancelado.' }
  if (!sesion.esAdmin && turno.profesional_id !== sesion.perfil.id) {
    return { error: 'Solo el profesional del turno o el administrador pueden modificarlo.' }
  }
  if (!tipoSesion) return { error: 'Elegí un tipo de sesión.' }
  if (tipoSesion === turno.tipo_sesion) return { error: 'Ya es el tipo que tenía.' }

  const { error } = await supabase.from('turnos').update({ tipo_sesion: tipoSesion }).eq('id', turno.id)
  if (error) return { error: error.message }

  await agregarEvento(
    supabase,
    sesion.centro.id,
    turno.id,
    'tipo',
    turno.tipo_sesion + ' → ' + tipoSesion,
    sesion.perfil.id,
  )

  revalidatePath('/agenda')
  revalidatePath('/turnos/' + turno.id)
  return { ok: 'Tipo de sesión actualizado.' }
}

// ============================================================
// UC-05 — Marcar realizado / ausente
// ============================================================
export async function marcarTurno(datos: FormData): Promise<void> {
  const sesion = await exigirSesion()
  const supabase = await clienteServidor()

  const turnoId = String(datos.get('turno_id') ?? '')
  const estado = String(datos.get('estado') ?? '') as EstadoTurno
  if (estado !== 'realizado' && estado !== 'ausente') return

  const turno = await turnoPorId(supabase, turnoId)
  if (!turno) return
  if (turno.estado === 'cancelado') return
  if (!sesion.esAdmin && turno.profesional_id !== sesion.perfil.id) return
  if (!yaPaso(turno.fecha, hhmm(turno.hora_inicio))) return

  const { error } = await supabase.from('turnos').update({ estado }).eq('id', turno.id)
  if (error) return

  await agregarEvento(supabase, sesion.centro.id, turno.id, estado, null, sesion.perfil.id)

  revalidatePath('/agenda')
  revalidatePath('/turnos/' + turno.id)
}

// ============================================================
// UC-06 — Observación clínica
// ============================================================
export async function guardarObservacion(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirSesion()
  const supabase = await clienteServidor()

  const turnoId = String(datos.get('turno_id') ?? '')
  const evolucion = String(datos.get('evolucion') ?? '').trim()
  const dolorCrudo = String(datos.get('dolor_referido') ?? '')
  const ejercicios = String(datos.get('ejercicios_indicados') ?? '').trim() || null
  const proxima = String(datos.get('proxima_sesion_sugerida') ?? '').trim() || null

  if (!evolucion) return { error: 'Escribí al menos la evolución de la sesión.' }

  const dolor = dolorCrudo === '' ? null : Number(dolorCrudo)
  if (dolor !== null && (!Number.isInteger(dolor) || dolor < 0 || dolor > 10)) {
    return { error: 'El dolor referido va de 0 a 10.' }
  }

  const turno = await turnoPorId(supabase, turnoId)
  if (!turno) return { error: 'No encontramos el turno.' }
  if (turno.estado !== 'realizado') return { error: 'Primero marcá el turno como realizado.' }
  if (!sesion.esAdmin && turno.profesional_id !== sesion.perfil.id) {
    return { error: 'La observación la carga el profesional que atendió la sesión.' }
  }

  const existente = await observacionDeTurno(supabase, turnoId)

  // Al corregir una nota ya cargada no se le cambia el autor, aunque la
  // edite el admin: profesional_id queda como quedó la primera vez.
  const { error } = existente
    ? await supabase
        .from('observaciones')
        .update({
          evolucion,
          dolor_referido: dolor,
          ejercicios_indicados: ejercicios,
          proxima_sesion_sugerida: proxima,
        })
        .eq('turno_id', turnoId)
    : await supabase.from('observaciones').insert({
        centro_id: sesion.centro.id,
        turno_id: turnoId,
        paciente_id: turno.paciente_id,
        profesional_id: sesion.perfil.id,
        evolucion,
        dolor_referido: dolor,
        ejercicios_indicados: ejercicios,
        proxima_sesion_sugerida: proxima,
      })

  if (error) return { error: error.message }

  await agregarEvento(supabase, sesion.centro.id, turnoId, 'observacion', null, sesion.perfil.id)

  revalidatePath('/turnos/' + turnoId)
  revalidatePath('/pacientes/' + turno.paciente_id)
  return { ok: 'Observación guardada en el historial del paciente.' }
}
