'use client'

// ============================================================
// Reservas online — envoltorio de las RPC públicas de Supabase
// (rol anon) que usa la página /reservar, sin login.
// Toda la validación fuerte vive en las funciones SQL de
// supabase/migrations/0004_signup_y_reservas_publicas.sql: acá
// solo se llama y se le da forma al resultado.
// ============================================================

import { clienteNavegador } from './supabase/navegador'

export interface ProfesionalPublico {
  id: string
  nombre: string
  especialidad: string | null
}

export interface SedePublica {
  id: string
  nombre: string
  direccion: string | null
  activa: boolean
}

export interface DatosReserva {
  centro: { id: string; nombre: string; duracion_turno_min: number; telefono: string | null } | null
  abierto: boolean
  profesionales: ProfesionalPublico[]
  sedes: SedePublica[]
}

export interface Franja {
  inicio: string
  fin: string
}

/** Cuántos días para adelante se puede reservar desde la página pública. */
export const DIAS_RESERVA_ONLINE = 60

export async function datosParaReservar(centroId: string | null): Promise<DatosReserva> {
  const vacio: DatosReserva = { centro: null, abierto: false, profesionales: [], sedes: [] }
  if (!centroId) return vacio

  const supabase = clienteNavegador()
  const { data, error } = await supabase.rpc('reserva_datos_centro', { p_centro_id: centroId })
  if (error || !data) return vacio

  return data as unknown as DatosReserva
}

export async function slotsPublicos(
  centroId: string,
  profesionalId: string,
  fecha: string,
): Promise<Franja[]> {
  if (!centroId || !profesionalId || !fecha) return []

  const supabase = clienteNavegador()
  const { data, error } = await supabase.rpc('reserva_slots', {
    p_centro_id: centroId,
    p_profesional_id: profesionalId,
    p_fecha: fecha,
  })
  if (error || !data) return []

  return (data as { inicio: string; fin: string }[]).map((f) => ({
    inicio: f.inicio.slice(0, 5),
    fin: f.fin.slice(0, 5),
  }))
}

export interface ResultadoReserva {
  error?: string
  ok?: string
  id?: string
  tipo_sesion?: string
}

export async function reservarTurnoPublico(input: {
  centroId: string
  profesionalId: string
  fecha: string
  horaInicio: string
  sedeId: string | null
  nombre: string
  apellido: string
  telefono: string
  email: string | null
  dni: string | null
  cobertura: 'particular' | 'obra_social'
  obraSocial: string | null
  primeraVez: boolean
  comentario: string | null
}): Promise<ResultadoReserva> {
  const supabase = clienteNavegador()
  const { data, error } = await supabase.rpc('reservar_turno_publico', {
    p_centro_id: input.centroId,
    p_profesional_id: input.profesionalId,
    p_fecha: input.fecha,
    p_hora_inicio: input.horaInicio,
    p_sede_id: input.sedeId,
    p_nombre: input.nombre,
    p_apellido: input.apellido,
    p_telefono: input.telefono,
    p_email: input.email,
    p_dni: input.dni,
    p_cobertura: input.cobertura,
    p_obra_social: input.obraSocial,
    p_primera_vez: input.primeraVez,
    p_comentario: input.comentario,
  })

  if (error) return { error: 'No pudimos tomar la reserva. Probá de nuevo.' }
  return (data as ResultadoReserva) ?? { error: 'No pudimos tomar la reserva. Probá de nuevo.' }
}
