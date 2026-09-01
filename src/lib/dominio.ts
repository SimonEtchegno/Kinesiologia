// ------------------------------------------------------------
// Tipos y etiquetas del dominio. Espejan el esquema de Postgres.
// ------------------------------------------------------------

export type Rol = 'admin' | 'kinesiologo'
export type EstadoTurno = 'confirmado' | 'reprogramado' | 'cancelado' | 'realizado' | 'ausente'
export type Cobertura = 'particular' | 'obra_social'

export interface Centro {
  id: string
  nombre: string
  kinesiologos_pueden_crear_turnos: boolean
  duracion_turno_min: number
}

export interface Perfil {
  id: string
  centro_id: string
  nombre: string
  email: string
  rol: Rol
  especialidad: string | null
  telefono: string | null
  activo: boolean
  debe_cambiar_password: boolean
}

export interface Sede {
  id: string
  nombre: string
  direccion: string | null
  activa: boolean
}

export interface Paciente {
  id: string
  centro_id: string
  nombre: string
  apellido: string
  dni: string | null
  telefono: string | null
  email: string | null
  fecha_nacimiento: string | null
  cobertura: Cobertura
  obra_social: string | null
  nro_afiliado: string | null
  notas: string | null
  activo: boolean
  created_at: string
}

export interface Turno {
  id: string
  centro_id: string
  profesional_id: string
  paciente_id: string
  sede_id: string | null
  fecha: string // YYYY-MM-DD
  hora_inicio: string // HH:MM:SS
  hora_fin: string
  tipo_sesion: string
  estado: EstadoTurno
  motivo: string | null
  created_at: string
}

export interface Observacion {
  id: string
  turno_id: string
  paciente_id: string
  profesional_id: string
  evolucion: string
  dolor_referido: number | null
  ejercicios_indicados: string | null
  proxima_sesion_sugerida: string | null
  created_at: string
}

export interface HorarioAtencion {
  id: string
  profesional_id: string
  sede_id: string | null
  dia_semana: number // 0 = domingo
  hora_inicio: string
  hora_fin: string
}

export interface TurnoEvento {
  id: string
  tipo: string
  detalle: string | null
  usuario_id: string | null
  created_at: string
}

/** Turno con los datos relacionados que la agenda necesita mostrar. */
export interface TurnoExpandido extends Turno {
  paciente: Pick<Paciente, 'id' | 'nombre' | 'apellido' | 'cobertura' | 'obra_social'> | null
  profesional: Pick<Perfil, 'id' | 'nombre' | 'especialidad'> | null
  sede: Pick<Sede, 'id' | 'nombre'> | null
  tiene_observacion: boolean
}

// ------------------------------------------------------------
// Etiquetas y colores
// ------------------------------------------------------------

export const ESTADOS: Record<
  EstadoTurno,
  { etiqueta: string; chip: string; punto: string; borde: string }
> = {
  confirmado: {
    etiqueta: 'Confirmado',
    chip: 'bg-marca-50 text-marca-700 ring-marca-200',
    punto: 'bg-marca-500',
    borde: 'border-l-marca-400',
  },
  reprogramado: {
    etiqueta: 'Reprogramado',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    punto: 'bg-amber-500',
    borde: 'border-l-amber-400',
  },
  realizado: {
    etiqueta: 'Realizado',
    chip: 'bg-acento-50 text-acento-700 ring-acento-200',
    punto: 'bg-acento-500',
    borde: 'border-l-acento-400',
  },
  ausente: {
    etiqueta: 'Ausente',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    punto: 'bg-rose-500',
    borde: 'border-l-rose-400',
  },
  cancelado: {
    etiqueta: 'Cancelado',
    chip: 'bg-slate-100 text-slate-500 ring-slate-200',
    punto: 'bg-slate-400',
    borde: 'border-l-slate-300',
  },
}

/** Estados que ocupan lugar en la agenda. Un cancelado libera el horario. */
export const ESTADOS_VIGENTES: EstadoTurno[] = [
  'confirmado',
  'reprogramado',
  'realizado',
  'ausente',
]

/** Un turno cerrado ya no se reprograma ni se cancela (UC-04). */
export const ESTADOS_CERRADOS: EstadoTurno[] = ['realizado', 'ausente', 'cancelado']

export const TIPOS_SESION = [
  'Kinesiología',
  'Primera consulta / evaluación',
  'Rehabilitación traumatológica',
  'Kinesiología respiratoria',
  'Kinesiología deportiva',
  'Terapia manual',
  'Drenaje linfático',
  'Reeducación postural',
] as const

export const COBERTURAS: Record<Cobertura, string> = {
  particular: 'Particular',
  obra_social: 'Obra social',
}

export function nombreCompleto(p: { nombre: string; apellido: string } | null | undefined) {
  if (!p) return 'Paciente sin datos'
  return p.apellido + ', ' + p.nombre
}

export function iniciales(texto: string) {
  return texto
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
