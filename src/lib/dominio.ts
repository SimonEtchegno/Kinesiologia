// ------------------------------------------------------------
// Tipos y etiquetas del dominio. Espejan el esquema de Postgres.
// ------------------------------------------------------------

export type Rol = 'admin' | 'kinesiologo'
export type EstadoTurno = 'confirmado' | 'reprogramado' | 'cancelado' | 'realizado' | 'ausente'
export type Cobertura = 'particular' | 'obra_social'
/** Quién cargó el turno: el centro, o el propio paciente desde la página pública. */
export type OrigenTurno = 'centro' | 'online'

export interface Centro {
  id: string
  nombre: string
  kinesiologos_pueden_crear_turnos: boolean
  duracion_turno_min: number
  /** Si está en false, la página pública de reservas queda cerrada. */
  reservas_publicas: boolean
  /** Al cargar un ingreso, ofrecer el WhatsApp de bienvenida sin que se lo pidan. */
  whatsapp_ingreso_automatico: boolean
  /** Teléfono del centro, el que ve el paciente para escribir. */
  telefono: string | null
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
  origen: OrigenTurno
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
  paciente: Pick<Paciente, 'id' | 'nombre' | 'apellido' | 'cobertura' | 'obra_social' | 'telefono'> | null
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

// ------------------------------------------------------------
// Tipos de sesión — cada uno con su color en la agenda.
// `valor` es lo que se guarda en el turno (tipo_sesion), así que
// no se toca: los valores viejos siguen pintando bien. Los marcados
// `oculto` no se ofrecen al cargar un turno nuevo, solo existen
// para darle color a turnos ya cargados.
// ------------------------------------------------------------

export const GRUPO_INGRESO = 'Ingreso y controles'
export const GRUPO_TRAUMA = 'Traumatología'
export const GRUPO_OTRAS = 'Otras especialidades'

export interface TipoSesion {
  valor: string
  etiqueta: string
  /** Versión corta, para los bloques chicos de la grilla semanal. */
  corto: string
  grupo: string
  chip: string
  punto: string
  borde: string
  oculto?: boolean
}

export const TIPOS_SESION: TipoSesion[] = [
  {
    valor: 'Ingreso',
    corto: 'Ingreso',
    etiqueta: 'Ingreso (primera sesión)',
    grupo: GRUPO_INGRESO,
    chip: 'bg-violet-50 text-violet-700 ring-violet-200',
    punto: 'bg-violet-500',
    borde: 'border-l-violet-500',
  },
  {
    valor: 'Primera consulta / evaluación',
    corto: 'Evaluación',
    etiqueta: 'Primera consulta / evaluación',
    grupo: GRUPO_INGRESO,
    chip: 'bg-purple-50 text-purple-700 ring-purple-200',
    punto: 'bg-purple-500',
    borde: 'border-l-purple-500',
    oculto: true,
  },
  {
    valor: 'Control / reevaluación',
    corto: 'Control',
    etiqueta: 'Control / reevaluación',
    grupo: GRUPO_INGRESO,
    chip: 'bg-slate-100 text-slate-700 ring-slate-300',
    punto: 'bg-slate-500',
    borde: 'border-l-slate-400',
  },

  {
    valor: 'Rehabilitación traumatológica',
    corto: 'Traumatología',
    etiqueta: 'Traumatología — general',
    grupo: GRUPO_TRAUMA,
    chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
    punto: 'bg-fuchsia-500',
    borde: 'border-l-fuchsia-500',
  },
  {
    valor: 'Traumatología — columna',
    corto: 'Trauma. columna',
    etiqueta: 'Traumatología — columna',
    grupo: GRUPO_TRAUMA,
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    punto: 'bg-amber-500',
    borde: 'border-l-amber-500',
  },
  {
    valor: 'Traumatología — miembro superior',
    corto: 'Trauma. m. superior',
    etiqueta: 'Traumatología — miembro superior',
    grupo: GRUPO_TRAUMA,
    chip: 'bg-orange-50 text-orange-700 ring-orange-200',
    punto: 'bg-orange-500',
    borde: 'border-l-orange-500',
  },
  {
    valor: 'Traumatología — miembro inferior',
    corto: 'Trauma. m. inferior',
    etiqueta: 'Traumatología — miembro inferior',
    grupo: GRUPO_TRAUMA,
    chip: 'bg-pink-50 text-pink-700 ring-pink-200',
    punto: 'bg-pink-500',
    borde: 'border-l-pink-500',
  },
  {
    valor: 'Traumatología — post-quirúrgico',
    corto: 'Trauma. post-qx',
    etiqueta: 'Traumatología — post-quirúrgico',
    grupo: GRUPO_TRAUMA,
    chip: 'bg-red-50 text-red-700 ring-red-200',
    punto: 'bg-red-500',
    borde: 'border-l-red-500',
  },

  {
    valor: 'Kinesiología',
    corto: 'Kinesiología',
    etiqueta: 'Kinesiología general',
    grupo: GRUPO_OTRAS,
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
    punto: 'bg-sky-500',
    borde: 'border-l-sky-500',
  },
  {
    valor: 'Kinesiología respiratoria',
    corto: 'Respiratoria',
    etiqueta: 'Kinesiología respiratoria',
    grupo: GRUPO_OTRAS,
    chip: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    punto: 'bg-cyan-500',
    borde: 'border-l-cyan-500',
  },
  {
    valor: 'Kinesiología deportiva',
    corto: 'Deportiva',
    etiqueta: 'Kinesiología deportiva',
    grupo: GRUPO_OTRAS,
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    punto: 'bg-emerald-500',
    borde: 'border-l-emerald-500',
  },
  {
    valor: 'Kinesiología neurológica',
    corto: 'Neurológica',
    etiqueta: 'Kinesiología neurológica',
    grupo: GRUPO_OTRAS,
    chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    punto: 'bg-indigo-500',
    borde: 'border-l-indigo-500',
  },
  {
    valor: 'Terapia manual',
    corto: 'Terapia manual',
    etiqueta: 'Terapia manual',
    grupo: GRUPO_OTRAS,
    chip: 'bg-teal-50 text-teal-700 ring-teal-200',
    punto: 'bg-teal-500',
    borde: 'border-l-teal-500',
  },
  {
    valor: 'Drenaje linfático',
    corto: 'Drenaje linfático',
    etiqueta: 'Drenaje linfático',
    grupo: GRUPO_OTRAS,
    chip: 'bg-blue-50 text-blue-700 ring-blue-200',
    punto: 'bg-blue-500',
    borde: 'border-l-blue-500',
  },
  {
    valor: 'Reeducación postural',
    corto: 'R. postural',
    etiqueta: 'Reeducación postural',
    grupo: GRUPO_OTRAS,
    chip: 'bg-lime-50 text-lime-800 ring-lime-200',
    punto: 'bg-lime-500',
    borde: 'border-l-lime-500',
  },
]

/** Los grupos, en el orden en que se muestran en el selector. */
export const GRUPOS_TIPO_SESION = [GRUPO_INGRESO, GRUPO_TRAUMA, GRUPO_OTRAS]

/** Turno de ingreso: la primera sesión del paciente. */
export const TIPO_INGRESO = 'Ingreso'

/** Lo que viene marcado por defecto al cargar un turno. */
export const TIPO_SESION_POR_DEFECTO = 'Kinesiología'

const TIPO_POR_VALOR = new Map(TIPOS_SESION.map((t) => [t.valor, t]))

/** El tipo con su color. Si el valor no está en el catálogo, cae en gris. */
export function tipoSesionDe(valor: string): TipoSesion {
  const conocido = TIPO_POR_VALOR.get(valor)
  if (conocido) return conocido
  return {
    valor,
    etiqueta: valor || 'Sin especificar',
    corto: valor || 'Sin tipo',
    grupo: GRUPO_OTRAS,
    chip: 'bg-slate-100 text-slate-600 ring-slate-200',
    punto: 'bg-slate-400',
    borde: 'border-l-slate-300',
  }
}

export function esIngreso(valor: string): boolean {
  return valor === TIPO_INGRESO
}

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
