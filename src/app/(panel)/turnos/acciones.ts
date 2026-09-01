import * as almacen from '@/lib/local/almacen'
import { esHora, esISO, hhmm, yaPaso } from '@/lib/fechas'
import type { EstadoTurno } from '@/lib/dominio'
import type { Sesion } from '@/lib/local/sesion'

export interface Resultado {
  error?: string
  ok?: string
  id?: string
}

// ============================================================
// UC-03 — Registrar un turno
// ============================================================
export function crearTurno(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const profesionalId = String(datos.get('profesional_id') ?? '')
  const fecha = String(datos.get('fecha') ?? '')
  const horaInicio = String(datos.get('hora_inicio') ?? '')
  const duracion = Number(datos.get('duracion') ?? sesion.centro.duracion_turno_min)
  const tipoSesion = String(datos.get('tipo_sesion') ?? '').trim() || 'Kinesiología'
  const sedeId = String(datos.get('sede_id') ?? '') || null
  const forzar = datos.get('forzar_fuera_de_horario') === 'si'

  let pacienteId = String(datos.get('paciente_id') ?? '')

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

    const r = almacen.crearPacienteRapido({
      centroId: sesion.centro.id, usuarioId: sesion.perfil.id, nombre, apellido, telefono, cobertura, obraSocial,
    })
    if (r.error || !r.id) return { error: r.error ?? 'No se pudo dar de alta al paciente.' }
    pacienteId = r.id
  }

  if (!pacienteId) return { error: 'Elegí el paciente.' }

  return almacen.crearTurno({
    centroId: sesion.centro.id,
    usuarioId: sesion.perfil.id,
    esAdmin: sesion.esAdmin,
    centroPermite: sesion.centro.kinesiologos_pueden_crear_turnos,
    profesionalId,
    pacienteId,
    fecha,
    horaInicio,
    duracionMin: duracion,
    tipoSesion,
    sedeId,
    forzarFueraDeHorario: forzar,
  })
}

// ============================================================
// UC-04 — Reprogramar
// ============================================================
export function reprogramarTurno(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const turnoId = String(datos.get('turno_id') ?? '')
  const fecha = String(datos.get('fecha') ?? '')
  const horaInicio = String(datos.get('hora_inicio') ?? '')
  const forzar = datos.get('forzar_fuera_de_horario') === 'si'

  if (!esISO(fecha) || !esHora(horaInicio)) return { error: 'Revisá la fecha y el horario.' }

  return almacen.reprogramarTurno({
    turnoId, usuarioId: sesion.perfil.id, esAdmin: sesion.esAdmin, fecha, horaInicio, forzarFueraDeHorario: forzar,
  })
}

// ============================================================
// UC-04 — Cancelar
// ============================================================
export function cancelarTurno(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const turnoId = String(datos.get('turno_id') ?? '')
  const motivo = String(datos.get('motivo') ?? '').trim()
  return almacen.cancelarTurno({ turnoId, usuarioId: sesion.perfil.id, esAdmin: sesion.esAdmin, motivo })
}

// ============================================================
// UC-05 — Marcar realizado / ausente
// ============================================================
export function marcarTurno(sesion: Sesion, datos: FormData): void {
  const turnoId = String(datos.get('turno_id') ?? '')
  const estado = String(datos.get('estado') ?? '') as EstadoTurno
  if (estado !== 'realizado' && estado !== 'ausente') return

  const turno = almacen.turnoPorId(turnoId)
  if (!turno) return
  if (turno.estado === 'cancelado') return
  if (!sesion.esAdmin && turno.profesional_id !== sesion.perfil.id) return
  if (!yaPaso(turno.fecha, hhmm(turno.hora_inicio))) return

  almacen.marcarTurno({ turnoId, usuarioId: sesion.perfil.id, esAdmin: sesion.esAdmin, estado })
}

// ============================================================
// UC-06 — Observación clínica
// ============================================================
export function guardarObservacion(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
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

  return almacen.guardarObservacion({
    turnoId, usuarioId: sesion.perfil.id, evolucion,
    dolorReferido: dolor, ejerciciosIndicados: ejercicios, proximaSesionSugerida: proxima,
  })
}
