import type {
  HorarioAtencion,
  Observacion,
  Paciente,
  Perfil,
  Sede,
  Turno,
  TurnoEvento,
  TurnoExpandido,
} from './dominio'
import { ESTADOS_VIGENTES } from './dominio'
import { desdeMinutos, diaSemana, grillaHoraria, minutos } from './fechas'
import type { clienteServidor } from './supabase/servidor'

export type Cliente = Awaited<ReturnType<typeof clienteServidor>>

/**
 * Todas estas consultas confían en RLS para el aislamiento por centro:
 * no hace falta filtrar por centro_id a mano, y si nos lo olvidáramos
 * la base tampoco devolvería datos de otro centro.
 */

const SELECT_TURNO =
  'id, centro_id, profesional_id, paciente_id, sede_id, fecha, hora_inicio, hora_fin, ' +
  'tipo_sesion, estado, motivo, origen, created_at, ' +
  'paciente:pacientes(id, nombre, apellido, cobertura, obra_social, telefono), ' +
  // turnos apunta a perfiles dos veces (profesional_id y created_by): hay que desambiguar.
  'profesional:perfiles!turnos_profesional_id_fkey(id, nombre, especialidad), ' +
  'sede:sedes(id, nombre), ' +
  'observaciones(id)'

interface FilaTurno extends Turno {
  paciente: TurnoExpandido['paciente'] | TurnoExpandido['paciente'][]
  profesional: TurnoExpandido['profesional'] | TurnoExpandido['profesional'][]
  sede: TurnoExpandido['sede'] | TurnoExpandido['sede'][]
  observaciones: { id: string }[] | { id: string } | null
}

function unaFila<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

function expandir(fila: FilaTurno): TurnoExpandido {
  const obs = fila.observaciones
  return {
    ...fila,
    paciente: unaFila(fila.paciente),
    profesional: unaFila(fila.profesional),
    sede: unaFila(fila.sede),
    tiene_observacion: Array.isArray(obs) ? obs.length > 0 : Boolean(obs),
  }
}

// ------------------------------------------------------------
// Profesionales y sedes
// ------------------------------------------------------------

export async function listarProfesionales(supabase: Cliente, soloActivos = true) {
  let q = supabase
    .from('perfiles')
    .select('id, centro_id, nombre, email, rol, especialidad, telefono, activo, debe_cambiar_password')
    .order('nombre')
  if (soloActivos) q = q.eq('activo', true)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Perfil[]
}

export async function listarSedes(supabase: Cliente, soloActivas = true) {
  let q = supabase.from('sedes').select('id, nombre, direccion, activa').order('nombre')
  if (soloActivas) q = q.eq('activa', true)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Sede[]
}

// ------------------------------------------------------------
// Agenda (UC-02, UC-11)
// ------------------------------------------------------------

export async function turnosEnRango(
  supabase: Cliente,
  desde: string,
  hasta: string,
  filtros: { profesionalId?: string; sedeId?: string; incluirCancelados?: boolean } = {},
): Promise<TurnoExpandido[]> {
  let q = supabase
    .from('turnos')
    .select(SELECT_TURNO)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha')
    .order('hora_inicio')

  if (filtros.profesionalId) q = q.eq('profesional_id', filtros.profesionalId)
  if (filtros.sedeId) q = q.eq('sede_id', filtros.sedeId)
  if (!filtros.incluirCancelados) q = q.neq('estado', 'cancelado')

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data as unknown as FilaTurno[] ?? []).map(expandir)
}

export async function turnoPorId(supabase: Cliente, id: string): Promise<TurnoExpandido | null> {
  const { data, error } = await supabase.from('turnos').select(SELECT_TURNO).eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return expandir(data as unknown as FilaTurno)
}

export async function eventosDeTurno(supabase: Cliente, turnoId: string) {
  const { data, error } = await supabase
    .from('turno_eventos')
    .select('id, tipo, detalle, usuario_id, created_at')
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as TurnoEvento[]
}

export async function observacionDeTurno(
  supabase: Cliente,
  turnoId: string,
): Promise<Observacion | null> {
  const { data, error } = await supabase
    .from('observaciones')
    .select(
      'id, turno_id, paciente_id, profesional_id, evolucion, dolor_referido, ' +
        'ejercicios_indicados, proxima_sesion_sugerida, created_at',
    )
    .eq('turno_id', turnoId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data ?? null) as unknown as Observacion | null
}

// ------------------------------------------------------------
// Pacientes (UC-07, UC-08)
// ------------------------------------------------------------

const SELECT_PACIENTE =
  'id, centro_id, nombre, apellido, dni, telefono, email, fecha_nacimiento, ' +
  'cobertura, obra_social, nro_afiliado, notas, activo, created_at'

export async function buscarPacientes(
  supabase: Cliente,
  texto: string,
  opciones: { incluirInactivos?: boolean; limite?: number } = {},
) {
  let q = supabase.from('pacientes').select(SELECT_PACIENTE).order('apellido').order('nombre')

  if (!opciones.incluirInactivos) q = q.eq('activo', true)

  const t = texto.trim()
  if (t) {
    const patron = '%' + t.replace(/[%_,]/g, '') + '%'
    q = q.or(
      ['apellido.ilike.' + patron, 'nombre.ilike.' + patron, 'dni.ilike.' + patron].join(','),
    )
  }

  const { data, error } = await q.limit(opciones.limite ?? 200)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Paciente[]
}

export async function pacientePorId(supabase: Cliente, id: string): Promise<Paciente | null> {
  const { data, error } = await supabase
    .from('pacientes')
    .select(SELECT_PACIENTE)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data ?? null) as unknown as Paciente | null
}

/**
 * Ids de pacientes que ya tienen al menos un turno cargado. Sirve para
 * saber, al elegir un paciente en el formulario de turno nuevo, si es su
 * primera sesión (así se ofrece el tipo "Ingreso" por defecto).
 */
export async function pacientesConTurnoPrevio(supabase: Cliente): Promise<Set<string>> {
  const { data, error } = await supabase.from('turnos').select('paciente_id')
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((t) => t.paciente_id as string))
}

/** Turnos + observaciones de un paciente, para la línea de tiempo (UC-07). */
export async function historialPaciente(supabase: Cliente, pacienteId: string) {
  const [turnos, obs] = await Promise.all([
    supabase
      .from('turnos')
      .select(SELECT_TURNO)
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })
      .order('hora_inicio', { ascending: false }),
    supabase
      .from('observaciones')
      .select(
        'id, turno_id, paciente_id, profesional_id, evolucion, dolor_referido, ' +
          'ejercicios_indicados, proxima_sesion_sugerida, created_at',
      )
      .eq('paciente_id', pacienteId),
  ])

  if (turnos.error) throw new Error(turnos.error.message)
  if (obs.error) throw new Error(obs.error.message)

  const observaciones = (obs.data ?? []) as unknown as Observacion[]
  const porTurno = new Map(observaciones.map((o) => [o.turno_id, o]))

  return {
    turnos: ((turnos.data as unknown as FilaTurno[]) ?? []).map(expandir),
    observacionPorTurno: porTurno,
  }
}

// ------------------------------------------------------------
// Horarios de atención (UC-09) y disponibilidad (UC-03)
// ------------------------------------------------------------

export async function horariosDe(supabase: Cliente, profesionalId: string) {
  const { data, error } = await supabase
    .from('horarios_atencion')
    .select('id, profesional_id, sede_id, dia_semana, hora_inicio, hora_fin')
    .eq('profesional_id', profesionalId)
    .order('dia_semana')
    .order('hora_inicio')
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as HorarioAtencion[]
}

export async function horariosDelCentro(supabase: Cliente) {
  const { data, error } = await supabase
    .from('horarios_atencion')
    .select('id, profesional_id, sede_id, dia_semana, hora_inicio, hora_fin')
    .order('dia_semana')
    .order('hora_inicio')
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as HorarioAtencion[]
}

export interface Franja {
  inicio: string // HH:MM
  fin: string // HH:MM
}

/**
 * Cuántos turnos vigentes puede haber a la vez con el mismo profesional en
 * el mismo horario (sala compartida), y cuántos de esos cupos son de uso
 * general — el resto queda reservado para turnos de tipo Ingreso.
 * Espejo de capacidad_turnos_simultaneos()/cupos_generales_simultaneos()
 * en la base (0006_capacidad_turnos_simultaneos.sql): la última palabra
 * la tiene siempre el trigger ahí, esto es solo para no ofrecer en la UI
 * algo que sabemos que va a rebotar.
 */
export const CUPO_TOTAL_SIMULTANEO = 4
export const CUPO_GENERAL_SIMULTANEO = 3

/**
 * Horarios que se le pueden ofrecer para un turno: dentro de las franjas
 * declaradas por el profesional (UC-09) y con lugar en la capacidad
 * simultánea del profesional para ese horario (UC-03).
 * `excluir` sirve al reprogramar, para no chocar con el propio turno.
 */
export async function slotsDisponibles(
  supabase: Cliente,
  profesionalId: string,
  fecha: string,
  duracionMin: number,
  excluir?: string,
): Promise<{ libres: Franja[]; ocupados: Franja[]; atiende: boolean }> {
  const dow = diaSemana(fecha)

  const [horarios, turnos] = await Promise.all([
    supabase
      .from('horarios_atencion')
      .select('hora_inicio, hora_fin')
      .eq('profesional_id', profesionalId)
      .eq('dia_semana', dow)
      .order('hora_inicio'),
    supabase
      .from('turnos')
      .select('id, hora_inicio, hora_fin, tipo_sesion')
      .eq('profesional_id', profesionalId)
      .eq('fecha', fecha)
      .in('estado', ESTADOS_VIGENTES),
  ])

  if (horarios.error) throw new Error(horarios.error.message)
  if (turnos.error) throw new Error(turnos.error.message)

  const franjas = (horarios.data ?? []) as unknown as { hora_inicio: string; hora_fin: string }[]
  const tomados = (
    (turnos.data ?? []) as unknown as { id: string; hora_inicio: string; hora_fin: string; tipo_sesion: string }[]
  )
    .filter((t) => t.id !== excluir)
    .map((t) => ({ desde: minutos(t.hora_inicio), hasta: minutos(t.hora_fin) }))

  const libres: Franja[] = []
  for (const f of franjas) {
    for (const inicio of grillaHoraria(f.hora_inicio, f.hora_fin, duracionMin)) {
      const desde = minutos(inicio)
      const hasta = desde + duracionMin
      const solapados = tomados.filter((t) => desde < t.hasta && hasta > t.desde).length
      // Libre = queda lugar para al menos un Ingreso; el chequeo exacto por
      // tipo lo hace capacidadDisponible al confirmar.
      if (solapados < CUPO_TOTAL_SIMULTANEO) libres.push({ inicio, fin: desdeMinutos(hasta) })
    }
  }

  const ocupadosSet = new Map<string, Franja>()
  for (const t of tomados) {
    const franja = { inicio: desdeMinutos(t.desde), fin: desdeMinutos(t.hasta) }
    ocupadosSet.set(franja.inicio + '-' + franja.fin, franja)
  }

  return {
    libres,
    ocupados: [...ocupadosSet.values()],
    atiende: franjas.length > 0,
  }
}

export interface Capacidad {
  disponible: boolean
  motivo?: string
}

/**
 * ¿Hay lugar para un turno de este tipo en este rango, con este
 * profesional? Espejo en JS de hay_lugar_turno() en la base — sirve para
 * dar un error claro antes de intentar el insert; el trigger de
 * turnos_capacidad es quien de verdad lo hace cumplir.
 * `excluir` sirve al reprogramar, para no contar el propio turno.
 */
export async function capacidadDisponible(
  supabase: Cliente,
  profesionalId: string,
  fecha: string,
  inicio: string,
  fin: string,
  tipoSesion: string,
  excluir?: string,
): Promise<Capacidad> {
  let q = supabase
    .from('turnos')
    .select('id, tipo_sesion')
    .eq('profesional_id', profesionalId)
    .eq('fecha', fecha)
    .in('estado', ESTADOS_VIGENTES)
    .lt('hora_inicio', fin)
    .gt('hora_fin', inicio)
  if (excluir) q = q.neq('id', excluir)

  const { data, error } = await q
  if (error) throw new Error(error.message)

  const solapados = (data ?? []) as unknown as { id: string; tipo_sesion: string }[]
  const total = solapados.length
  const noIngreso = solapados.filter((t) => t.tipo_sesion !== 'Ingreso').length

  if (total >= CUPO_TOTAL_SIMULTANEO) {
    return { disponible: false, motivo: 'Ese horario ya está completo con este profesional.' }
  }
  if (tipoSesion !== 'Ingreso' && noIngreso >= CUPO_GENERAL_SIMULTANEO) {
    return {
      disponible: false,
      motivo:
        'Los ' + CUPO_GENERAL_SIMULTANEO + ' lugares generales de ese horario ya están ' +
        'ocupados; el que queda es solo para un turno de tipo Ingreso.',
    }
  }
  return { disponible: true }
}

/** ¿La franja pedida cae dentro de los horarios declarados? (UC-09) */
export async function estaEnHorarioDeAtencion(
  supabase: Cliente,
  profesionalId: string,
  fecha: string,
  inicio: string,
  fin: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('horarios_atencion')
    .select('hora_inicio, hora_fin')
    .eq('profesional_id', profesionalId)
    .eq('dia_semana', diaSemana(fecha))
  if (error) throw new Error(error.message)

  const d = minutos(inicio)
  const h = minutos(fin)
  return ((data ?? []) as unknown as { hora_inicio: string; hora_fin: string }[]).some(
    (f) => d >= minutos(f.hora_inicio) && h <= minutos(f.hora_fin),
  )
}

