'use client'

// ============================================================
// Almacén local — toda la persistencia vive en localStorage.
// Es el reemplazo temporal de Supabase (ver README, sección
// "Modo local"). Replica las mismas reglas de negocio que las
// migraciones SQL: anti-solape de turnos, precondiciones de cada
// caso de uso, baja lógica en vez de borrado.
// ============================================================

import { grillaHoraria, minutos, desdeMinutos, diaSemana } from '@/lib/fechas'
import {
  ESTADOS_CERRADOS,
  ESTADOS_VIGENTES,
  type Centro,
  type Cobertura,
  type EstadoTurno,
  type HorarioAtencion,
  type Observacion,
  type Paciente,
  type Perfil,
  type Rol,
  type Sede,
  type Turno,
  type TurnoEvento,
  type TurnoExpandido,
} from '@/lib/dominio'

const CLAVE = 'kinesio.v1'
const CLAVE_SESION = 'kinesio.sesion'

/** Sede en dominio.ts no lleva centro_id (en Supabase eso lo resuelve RLS);
 *  acá lo necesitamos para poder filtrar a mano. */
interface SedeAlmacenada extends Sede {
  centro_id: string
}

/** TurnoEvento en dominio.ts tampoco lleva turno_id (mismo motivo). */
interface EventoAlmacenado extends TurnoEvento {
  turno_id: string
}

interface BaseDatos {
  centros: Centro[]
  sedes: SedeAlmacenada[]
  perfiles: Perfil[]
  // email en minúsculas -> contraseña. Separado de "perfiles" porque el
  // dominio no modela credenciales; esto es solo para el modo local.
  credenciales: Record<string, string>
  pacientes: Paciente[]
  turnos: Turno[]
  turnoEventos: EventoAlmacenado[]
  observaciones: Observacion[]
  horarios: HorarioAtencion[]
}

function id(): string {
  return crypto.randomUUID()
}

function enNavegador(): boolean {
  return typeof window !== 'undefined'
}

// ------------------------------------------------------------
// Semilla: un centro con dos profesionales, pacientes y turnos
// de la semana actual, para que la app no arranque vacía.
// ------------------------------------------------------------
function sembrar(): BaseDatos {
  const centroId = id()
  const sedeId = id()
  const adminId = id()
  const kineId = id()

  const hoy = new Date()
  const iso = (d: Date) => {
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return d.getFullYear() + '-' + m + '-' + dd
  }
  const restar = (n: number) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - n)
    return iso(d)
  }

  const pacientes: Paciente[] = [
    {
      id: id(), centro_id: centroId, nombre: 'Lucía', apellido: 'Ferreyra', dni: '32456789',
      telefono: '11 4455-1122', email: 'lucia.ferreyra@mail.com', fecha_nacimiento: '1986-03-14',
      cobertura: 'obra_social', obra_social: 'OSDE', nro_afiliado: '62-4455112-01',
      notas: 'Derivada por hombro doloroso. 10 sesiones autorizadas.', activo: true,
      created_at: new Date().toISOString(),
    },
    {
      id: id(), centro_id: centroId, nombre: 'Martín', apellido: 'Quiroga', dni: '28991234',
      telefono: '11 6677-8899', email: null, fecha_nacimiento: '1981-11-02',
      cobertura: 'particular', obra_social: null, nro_afiliado: null,
      notas: 'Post operatorio de rodilla derecha.', activo: true, created_at: new Date().toISOString(),
    },
    {
      id: id(), centro_id: centroId, nombre: 'Sofía', apellido: 'Beltrán', dni: '41233445',
      telefono: '11 3344-5566', email: 'sofi.beltran@mail.com', fecha_nacimiento: '1998-07-21',
      cobertura: 'obra_social', obra_social: 'Swiss Medical', nro_afiliado: 'SM-9981223',
      notas: null, activo: true, created_at: new Date().toISOString(),
    },
    {
      id: id(), centro_id: centroId, nombre: 'Jorge', apellido: 'Nieto', dni: '17554321',
      telefono: '11 2233-4455', email: null, fecha_nacimiento: '1962-01-30',
      cobertura: 'obra_social', obra_social: 'PAMI', nro_afiliado: 'PAMI-1755432',
      notas: 'Marcha con bastón. Sesiones cortas.', activo: true, created_at: new Date().toISOString(),
    },
    {
      id: id(), centro_id: centroId, nombre: 'Camila', apellido: 'Ordóñez', dni: '38776655',
      telefono: '11 5566-7788', email: 'camila.o@mail.com', fecha_nacimiento: '1993-09-08',
      cobertura: 'particular', obra_social: null, nro_afiliado: null,
      notas: null, activo: true, created_at: new Date().toISOString(),
    },
  ]

  const turnos: Turno[] = []
  const turnoEventos: EventoAlmacenado[] = []
  const observaciones: Observacion[] = []

  const tipos = ['Kinesiología', 'Rehabilitación traumatológica', 'Terapia manual', 'Kinesiología deportiva']

  for (let dia = 6; dia >= -4; dia--) {
    const fecha = restar(dia)
    const dow = diaSemana(fecha)
    if (dow === 0 || dow === 6) continue // fin de semana, sin horarios

    const franjas = [
      { inicio: '09:00', fin: '13:00' },
      { inicio: '15:00', fin: '19:00' },
    ]

    for (const prof of [adminId, kineId]) {
      let turnosDelDia = 0
      for (const franja of franjas) {
        for (const hora of grillaHoraria(franja.inicio, franja.fin, 45)) {
          if (turnosDelDia >= 3) break
          if (Math.random() > 0.4) continue
          turnosDelDia++

          const paciente = pacientes[Math.floor(Math.random() * pacientes.length)]!
          const finM = minutos(hora) + 45
          let estado: EstadoTurno
          if (dia > 0) {
            const r = Math.random()
            estado = r < 0.75 ? 'realizado' : r < 0.9 ? 'ausente' : 'cancelado'
          } else if (dia === 0) {
            estado = minutos(hora) < hoy.getHours() * 60 + hoy.getMinutes() ? 'realizado' : 'confirmado'
          } else {
            estado = 'confirmado'
          }

          const turnoId = id()
          turnos.push({
            id: turnoId, centro_id: centroId, profesional_id: prof, paciente_id: paciente.id,
            sede_id: sedeId, fecha, hora_inicio: hora + ':00', hora_fin: desdeMinutos(finM) + ':00',
            tipo_sesion: tipos[Math.floor(Math.random() * tipos.length)]!, estado,
            motivo: estado === 'cancelado' ? 'Avisó el paciente' : null,
            created_at: new Date().toISOString(),
          })
          turnoEventos.push({
            id: id(), turno_id: turnoId, tipo: 'creado', detalle: null, usuario_id: adminId,
            created_at: new Date().toISOString(),
          })

          if (estado === 'realizado' && Math.random() < 0.85) {
            observaciones.push({
              id: id(), turno_id: turnoId, paciente_id: paciente.id, profesional_id: prof,
              evolucion: 'Buena tolerancia a la carga. Mejora el rango de movimiento respecto de la sesión anterior.',
              dolor_referido: Math.floor(Math.random() * 6),
              ejercicios_indicados: 'Isométricos 3 x 20 segundos, dos veces por día.',
              proxima_sesion_sugerida: 'En 3 días',
              created_at: new Date().toISOString(),
            })
          }
        }
      }
    }
  }

  const db: BaseDatos = {
    centros: [
      { id: centroId, nombre: 'Centro Kine Palermo', kinesiologos_pueden_crear_turnos: true, duracion_turno_min: 45 },
    ],
    sedes: [{ id: sedeId, centro_id: centroId, nombre: 'Sede Palermo', direccion: null, activa: true }],
    perfiles: [
      {
        id: adminId, centro_id: centroId, nombre: 'Valentina Correa', email: 'admin@centrokine.com.ar',
        rol: 'admin', especialidad: 'Kinesiología deportiva', telefono: '11 5555-1234',
        activo: true, debe_cambiar_password: false,
      },
      {
        id: kineId, centro_id: centroId, nombre: 'Tomás Ibáñez', email: 'tomas@centrokine.com.ar',
        rol: 'kinesiologo', especialidad: 'Kinesiología respiratoria', telefono: '11 5555-5678',
        activo: true, debe_cambiar_password: false,
      },
    ],
    credenciales: { 'admin@centrokine.com.ar': 'kinesio123', 'tomas@centrokine.com.ar': 'kinesio123' },
    pacientes,
    turnos,
    turnoEventos,
    observaciones,
    horarios: [adminId, kineId].flatMap((prof) =>
      [1, 2, 3, 4, 5].flatMap((dia) => [
        { id: id(), profesional_id: prof, sede_id: sedeId, dia_semana: dia, hora_inicio: '09:00:00', hora_fin: '13:00:00' },
        { id: id(), profesional_id: prof, sede_id: sedeId, dia_semana: dia, hora_inicio: '15:00:00', hora_fin: '19:00:00' },
      ]),
    ),
  }

  return db
}

let cache: BaseDatos | null = null

function cargar(): BaseDatos {
  if (cache) return cache
  if (!enNavegador()) {
    // Render en servidor (primer paint): base vacía, se hidrata en el cliente.
    return { centros: [], sedes: [], perfiles: [], credenciales: {}, pacientes: [], turnos: [], turnoEventos: [], observaciones: [], horarios: [] }
  }
  const crudo = window.localStorage.getItem(CLAVE)
  if (crudo) {
    try {
      cache = JSON.parse(crudo) as BaseDatos
      return cache
    } catch {
      // localStorage corrupto: se vuelve a sembrar abajo.
    }
  }
  cache = sembrar()
  window.localStorage.setItem(CLAVE, JSON.stringify(cache))
  return cache
}

function guardar(db: BaseDatos) {
  cache = db
  if (enNavegador()) window.localStorage.setItem(CLAVE, JSON.stringify(db))
}

/** Vuelve a sembrar todo desde cero (te desloguea: se borran hasta las cuentas). */
export function reiniciarDatos() {
  cache = null
  if (enNavegador()) {
    window.localStorage.removeItem(CLAVE)
    window.localStorage.removeItem(CLAVE_SESION)
  }
  cargar()
}

/**
 * Vacía los datos de ejemplo del centro (pacientes, turnos, observaciones y
 * su bitácora) para arrancar a cargar los reales. Mantiene las cuentas, las
 * credenciales y los horarios de atención, así no hace falta volver a entrar.
 */
export function vaciarDatosClinicos(centroId: string) {
  const db = cargar()
  const turnosDelCentro = new Set(db.turnos.filter((t) => t.centro_id === centroId).map((t) => t.id))

  db.pacientes = db.pacientes.filter((p) => p.centro_id !== centroId)
  db.turnos = db.turnos.filter((t) => t.centro_id !== centroId)
  db.turnoEventos = db.turnoEventos.filter((e) => !turnosDelCentro.has(e.turno_id))
  db.observaciones = db.observaciones.filter((o) => !turnosDelCentro.has(o.turno_id))

  guardar(db)
}

// ------------------------------------------------------------
// Sesión (equivalente local a Supabase Auth)
// ------------------------------------------------------------

export function obtenerSesionActual(): Perfil | null {
  if (!enNavegador()) return null
  const pid = window.localStorage.getItem(CLAVE_SESION)
  if (!pid) return null
  const perfil = cargar().perfiles.find((p) => p.id === pid && p.activo)
  return perfil ?? null
}

export function iniciarSesion(email: string, password: string): { error?: string; perfil?: Perfil } {
  const db = cargar()
  const correo = email.trim().toLowerCase()
  const perfil = db.perfiles.find((p) => p.email === correo)
  const GENERICO = 'Email o contraseña incorrectos. Revisá los datos e intentá de nuevo.'

  if (!perfil || db.credenciales[correo] !== password) return { error: GENERICO }
  if (!perfil.activo) return { error: 'Tu cuenta está dada de baja. Contactá al administrador del centro.' }

  window.localStorage.setItem(CLAVE_SESION, perfil.id)
  return { perfil }
}

export function cerrarSesion() {
  if (enNavegador()) window.localStorage.removeItem(CLAVE_SESION)
}

export function centroDe(centroId: string): Centro | null {
  return cargar().centros.find((c) => c.id === centroId) ?? null
}

// ------------------------------------------------------------
// Profesionales y sedes
// ------------------------------------------------------------

export function listarProfesionales(centroId: string, soloActivos = true): Perfil[] {
  return cargar()
    .perfiles.filter((p) => p.centro_id === centroId && (!soloActivos || p.activo))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function listarSedes(centroId: string): Sede[] {
  return cargar()
    .sedes.filter((s) => s.centro_id === centroId && s.activa)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

// ------------------------------------------------------------
// Expansión de turnos (equivalente al SELECT con joins de Supabase)
// ------------------------------------------------------------

function expandir(db: BaseDatos, t: Turno): TurnoExpandido {
  const p = db.pacientes.find((x) => x.id === t.paciente_id) ?? null
  const pr = db.perfiles.find((x) => x.id === t.profesional_id) ?? null
  const s = db.sedes.find((x) => x.id === t.sede_id) ?? null
  return {
    ...t,
    paciente: p ? { id: p.id, nombre: p.nombre, apellido: p.apellido, cobertura: p.cobertura, obra_social: p.obra_social } : null,
    profesional: pr ? { id: pr.id, nombre: pr.nombre, especialidad: pr.especialidad } : null,
    sede: s ? { id: s.id, nombre: s.nombre } : null,
    tiene_observacion: db.observaciones.some((o) => o.turno_id === t.id),
  }
}

export function turnosEnRango(
  centroId: string,
  desde: string,
  hasta: string,
  filtros: { profesionalId?: string; sedeId?: string; incluirCancelados?: boolean } = {},
): TurnoExpandido[] {
  const db = cargar()
  return db.turnos
    .filter((t) => t.centro_id === centroId && t.fecha >= desde && t.fecha <= hasta)
    .filter((t) => !filtros.profesionalId || t.profesional_id === filtros.profesionalId)
    .filter((t) => !filtros.sedeId || t.sede_id === filtros.sedeId)
    .filter((t) => filtros.incluirCancelados || t.estado !== 'cancelado')
    .sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio))
    .map((t) => expandir(db, t))
}

export function turnoPorId(id: string): TurnoExpandido | null {
  const db = cargar()
  const t = db.turnos.find((x) => x.id === id)
  return t ? expandir(db, t) : null
}

export function eventosDeTurno(turnoId: string): TurnoEvento[] {
  return cargar()
    .turnoEventos.filter((e) => e.turno_id === turnoId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function observacionDeTurno(turnoId: string): Observacion | null {
  return cargar().observaciones.find((o) => o.turno_id === turnoId) ?? null
}

// ------------------------------------------------------------
// Pacientes
// ------------------------------------------------------------

export function buscarPacientes(
  centroId: string,
  texto: string,
  opciones: { incluirInactivos?: boolean } = {},
): Paciente[] {
  const t = texto.trim().toLowerCase()
  return cargar()
    .pacientes.filter((p) => p.centro_id === centroId)
    .filter((p) => opciones.incluirInactivos || p.activo)
    .filter((p) => !t || (p.apellido + ' ' + p.nombre + ' ' + (p.dni ?? '')).toLowerCase().includes(t))
    .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
}

export function pacientePorId(id: string): Paciente | null {
  return cargar().pacientes.find((p) => p.id === id) ?? null
}

export function historialPaciente(pacienteId: string) {
  const db = cargar()
  const turnos = db.turnos
    .filter((t) => t.paciente_id === pacienteId)
    .sort((a, b) => (b.fecha + b.hora_inicio).localeCompare(a.fecha + a.hora_inicio))
    .map((t) => expandir(db, t))
  const observacionPorTurno = new Map(db.observaciones.filter((o) => o.paciente_id === pacienteId).map((o) => [o.turno_id, o]))
  return { turnos, observacionPorTurno }
}

// ------------------------------------------------------------
// Horarios y disponibilidad (UC-09, UC-03)
// ------------------------------------------------------------

export function horariosDe(profesionalId: string): HorarioAtencion[] {
  return cargar()
    .horarios.filter((h) => h.profesional_id === profesionalId)
    .sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio))
}

export function horariosDelCentro(centroId: string): HorarioAtencion[] {
  const db = cargar()
  const idsDelCentro = new Set(db.perfiles.filter((p) => p.centro_id === centroId).map((p) => p.id))
  return db.horarios.filter((h) => idsDelCentro.has(h.profesional_id))
}

export interface Franja {
  inicio: string
  fin: string
}

export function slotsDisponibles(
  profesionalId: string,
  fecha: string,
  duracionMin: number,
  excluir?: string,
): { libres: Franja[]; ocupados: Franja[]; atiende: boolean } {
  const db = cargar()
  const dow = diaSemana(fecha)
  const franjas = db.horarios.filter((h) => h.profesional_id === profesionalId && h.dia_semana === dow)
  const tomados = db.turnos
    .filter(
      (t) =>
        t.profesional_id === profesionalId &&
        t.fecha === fecha &&
        t.id !== excluir &&
        ESTADOS_VIGENTES.includes(t.estado),
    )
    .map((t) => ({ desde: minutos(t.hora_inicio), hasta: minutos(t.hora_fin) }))

  const libres: Franja[] = []
  for (const f of franjas) {
    for (const inicio of grillaHoraria(f.hora_inicio, f.hora_fin, duracionMin)) {
      const desde = minutos(inicio)
      const hasta = desde + duracionMin
      if (!tomados.some((t) => desde < t.hasta && hasta > t.desde)) libres.push({ inicio, fin: desdeMinutos(hasta) })
    }
  }

  return {
    libres,
    ocupados: tomados.map((t) => ({ inicio: desdeMinutos(t.desde), fin: desdeMinutos(t.hasta) })),
    atiende: franjas.length > 0,
  }
}

export function estaEnHorarioDeAtencion(profesionalId: string, fecha: string, inicio: string, fin: string): boolean {
  const db = cargar()
  const d = minutos(inicio)
  const h = minutos(fin)
  return db.horarios
    .filter((x) => x.profesional_id === profesionalId && x.dia_semana === diaSemana(fecha))
    .some((f) => d >= minutos(f.hora_inicio) && h <= minutos(f.hora_fin))
}

export function hayChoque(
  profesionalId: string,
  fecha: string,
  inicio: string,
  fin: string,
  excluir?: string,
): TurnoExpandido | null {
  const db = cargar()
  const choque = db.turnos.find(
    (t) =>
      t.profesional_id === profesionalId &&
      t.fecha === fecha &&
      t.id !== excluir &&
      ESTADOS_VIGENTES.includes(t.estado) &&
      minutos(t.hora_inicio) < minutos(fin) &&
      minutos(t.hora_fin) > minutos(inicio),
  )
  return choque ? expandir(db, choque) : null
}

// ------------------------------------------------------------
// Mutaciones — turnos (UC-03, UC-04, UC-05, UC-06)
// ------------------------------------------------------------

export interface Resultado {
  error?: string
  ok?: string
  id?: string
}

export function crearTurno(input: {
  centroId: string
  usuarioId: string
  esAdmin: boolean
  centroPermite: boolean
  profesionalId: string
  pacienteId: string
  fecha: string
  horaInicio: string
  duracionMin: number
  tipoSesion: string
  sedeId: string | null
  forzarFueraDeHorario: boolean
}): Resultado {
  const db = cargar()

  if (!input.esAdmin) {
    if (!input.centroPermite) return { error: 'En este centro los turnos los carga el administrador.' }
    if (input.profesionalId !== input.usuarioId) return { error: 'Solo podés cargar turnos en tu propia agenda.' }
  }

  const horaFin = desdeMinutos(minutos(input.horaInicio) + input.duracionMin)
  if (minutos(horaFin) > 24 * 60) return { error: 'El turno no puede pasar de la medianoche.' }

  const enHorario = estaEnHorarioDeAtencion(input.profesionalId, input.fecha, input.horaInicio, horaFin)
  if (!enHorario && !input.forzarFueraDeHorario) {
    return { error: 'Ese horario queda fuera de las franjas de atención del profesional. Elegí otro, o confirmá que querés cargarlo igual.' }
  }

  const choque = hayChoque(input.profesionalId, input.fecha, input.horaInicio, horaFin)
  if (choque) {
    return { error: 'Ese horario ya está ocupado (' + choque.hora_inicio.slice(0, 5) + '–' + choque.hora_fin.slice(0, 5) + '). Elegí otro horario.' }
  }

  const turnoId = id()
  db.turnos.push({
    id: turnoId, centro_id: input.centroId, profesional_id: input.profesionalId, paciente_id: input.pacienteId,
    sede_id: input.sedeId, fecha: input.fecha, hora_inicio: input.horaInicio + ':00', hora_fin: horaFin + ':00',
    tipo_sesion: input.tipoSesion, estado: 'confirmado', motivo: null, created_at: new Date().toISOString(),
  })
  agregarEvento(
    db, turnoId, 'creado',
    input.fecha + ' ' + input.horaInicio + '–' + horaFin + (enHorario ? '' : ' (fuera de horario)'),
    input.usuarioId,
  )

  guardar(db)
  return { ok: 'Turno creado.', id: turnoId }
}

export function crearPacienteRapido(input: {
  centroId: string
  usuarioId: string
  nombre: string
  apellido: string
  telefono: string | null
  cobertura: Cobertura
  obraSocial: string | null
}): Resultado {
  const db = cargar()
  const pacId = id()
  db.pacientes.push({
    id: pacId, centro_id: input.centroId, nombre: input.nombre, apellido: input.apellido,
    dni: null, telefono: input.telefono, email: null, fecha_nacimiento: null,
    cobertura: input.cobertura, obra_social: input.cobertura === 'obra_social' ? input.obraSocial : null,
    nro_afiliado: null, notas: null, activo: true, created_at: new Date().toISOString(),
  })
  guardar(db)
  return { ok: 'Paciente creado.', id: pacId }
}

function agregarEvento(db: BaseDatos, turnoId: string, tipo: string, detalle: string | null, usuarioId: string) {
  db.turnoEventos.push({
    id: id(), turno_id: turnoId, tipo, detalle, usuario_id: usuarioId, created_at: new Date().toISOString(),
  })
}

export function reprogramarTurno(input: {
  turnoId: string
  usuarioId: string
  esAdmin: boolean
  fecha: string
  horaInicio: string
  forzarFueraDeHorario: boolean
}): Resultado {
  const db = cargar()
  const turno = db.turnos.find((t) => t.id === input.turnoId)
  if (!turno) return { error: 'No encontramos el turno.' }
  if (ESTADOS_CERRADOS.includes(turno.estado)) return { error: 'Este turno ya está cerrado: no se puede reprogramar.' }
  if (!input.esAdmin && turno.profesional_id !== input.usuarioId) {
    return { error: 'Solo el profesional del turno o el administrador pueden modificarlo.' }
  }

  const duracion = minutos(turno.hora_fin) - minutos(turno.hora_inicio)
  const horaFin = desdeMinutos(minutos(input.horaInicio) + duracion)
  if (input.fecha === turno.fecha && input.horaInicio === turno.hora_inicio.slice(0, 5)) {
    return { error: 'Es el mismo horario que ya tenía.' }
  }

  const enHorario = estaEnHorarioDeAtencion(turno.profesional_id, input.fecha, input.horaInicio, horaFin)
  if (!enHorario && !input.forzarFueraDeHorario) {
    return { error: 'Ese horario queda fuera de las franjas de atención del profesional. Elegí otro, o confirmá que querés reprogramarlo igual.' }
  }

  const choque = hayChoque(turno.profesional_id, input.fecha, input.horaInicio, horaFin, turno.id)
  if (choque) return { error: 'Ese horario ya está ocupado (' + choque.hora_inicio.slice(0, 5) + '–' + choque.hora_fin.slice(0, 5) + ').' }

  turno.fecha = input.fecha
  turno.hora_inicio = input.horaInicio + ':00'
  turno.hora_fin = horaFin + ':00'
  turno.estado = 'reprogramado'

  agregarEvento(db, turno.id, 'reprogramado', 'A ' + input.fecha + ' ' + input.horaInicio + (enHorario ? '' : ' (fuera de horario)'), input.usuarioId)
  guardar(db)
  return { ok: 'Turno reprogramado.' }
}

export function cancelarTurno(input: { turnoId: string; usuarioId: string; esAdmin: boolean; motivo: string }): Resultado {
  const db = cargar()
  const turno = db.turnos.find((t) => t.id === input.turnoId)
  if (!turno) return { error: 'No encontramos el turno.' }
  if (ESTADOS_CERRADOS.includes(turno.estado)) return { error: 'Este turno ya está cerrado: no se puede cancelar.' }
  if (!input.esAdmin && turno.profesional_id !== input.usuarioId) {
    return { error: 'Solo el profesional del turno o el administrador pueden cancelarlo.' }
  }

  turno.estado = 'cancelado'
  turno.motivo = input.motivo || null
  agregarEvento(db, turno.id, 'cancelado', input.motivo || null, input.usuarioId)
  guardar(db)
  return { ok: 'Turno cancelado.' }
}

export function marcarTurno(input: { turnoId: string; usuarioId: string; esAdmin: boolean; estado: 'realizado' | 'ausente' }): Resultado {
  const db = cargar()
  const turno = db.turnos.find((t) => t.id === input.turnoId)
  if (!turno) return { error: 'No encontramos el turno.' }
  if (turno.estado === 'cancelado') return { error: 'El turno está cancelado.' }
  if (!input.esAdmin && turno.profesional_id !== input.usuarioId) return { error: 'No podés modificar este turno.' }

  turno.estado = input.estado
  agregarEvento(db, turno.id, input.estado, null, input.usuarioId)
  guardar(db)
  return { ok: 'Listo.' }
}

export function guardarObservacion(input: {
  turnoId: string
  usuarioId: string
  evolucion: string
  dolorReferido: number | null
  ejerciciosIndicados: string | null
  proximaSesionSugerida: string | null
}): Resultado {
  const db = cargar()
  const turno = db.turnos.find((t) => t.id === input.turnoId)
  if (!turno) return { error: 'No encontramos el turno.' }
  if (turno.estado !== 'realizado') return { error: 'Primero marcá el turno como realizado.' }
  if (turno.profesional_id !== input.usuarioId) return { error: 'La observación la carga el profesional que atendió la sesión.' }

  const existente = db.observaciones.find((o) => o.turno_id === input.turnoId)
  if (existente) {
    existente.evolucion = input.evolucion
    existente.dolor_referido = input.dolorReferido
    existente.ejercicios_indicados = input.ejerciciosIndicados
    existente.proxima_sesion_sugerida = input.proximaSesionSugerida
  } else {
    db.observaciones.push({
      id: id(), turno_id: input.turnoId, paciente_id: turno.paciente_id, profesional_id: input.usuarioId,
      evolucion: input.evolucion, dolor_referido: input.dolorReferido,
      ejercicios_indicados: input.ejerciciosIndicados, proxima_sesion_sugerida: input.proximaSesionSugerida,
      created_at: new Date().toISOString(),
    })
  }

  agregarEvento(db, input.turnoId, 'observacion', null, input.usuarioId)
  guardar(db)
  return { ok: 'Observación guardada en el historial del paciente.' }
}

// ------------------------------------------------------------
// Mutaciones — pacientes (UC-07, UC-08)
// ------------------------------------------------------------

export interface CamposPaciente {
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
}

export function crearPaciente(centroId: string, campos: CamposPaciente): Resultado {
  const db = cargar()
  if (campos.dni && db.pacientes.some((p) => p.centro_id === centroId && p.dni === campos.dni)) {
    return { error: 'Ya hay un paciente con ese DNI en el centro.' }
  }
  const pacId = id()
  db.pacientes.push({ id: pacId, centro_id: centroId, activo: true, created_at: new Date().toISOString(), ...campos })
  guardar(db)
  return { ok: 'Paciente creado.', id: pacId }
}

export function actualizarPaciente(pacienteId: string, campos: CamposPaciente): Resultado {
  const db = cargar()
  const p = db.pacientes.find((x) => x.id === pacienteId)
  if (!p) return { error: 'No encontramos al paciente.' }
  if (campos.dni && db.pacientes.some((x) => x.id !== pacienteId && x.centro_id === p.centro_id && x.dni === campos.dni)) {
    return { error: 'Ya hay otro paciente con ese DNI.' }
  }
  Object.assign(p, campos)
  guardar(db)
  return { ok: 'Cambios guardados.' }
}

export function cambiarActivoPaciente(pacienteId: string, activo: boolean) {
  const db = cargar()
  const p = db.pacientes.find((x) => x.id === pacienteId)
  if (p) {
    p.activo = activo
    guardar(db)
  }
}

// ------------------------------------------------------------
// Mutaciones — horarios (UC-09)
// ------------------------------------------------------------

export function agregarHorario(input: {
  profesionalId: string
  sedeId: string | null
  dias: number[]
  horaInicio: string
  horaFin: string
}): Resultado {
  const db = cargar()
  for (const dia of input.dias) {
    const solapa = db.horarios.some(
      (h) =>
        h.profesional_id === input.profesionalId &&
        h.dia_semana === dia &&
        minutos(input.horaInicio) < minutos(h.hora_fin) &&
        minutos(input.horaFin) > minutos(h.hora_inicio),
    )
    if (solapa) return { error: 'Esa franja se superpone con otra que ya tenés cargada.' }
  }

  for (const dia of input.dias) {
    db.horarios.push({
      id: id(), profesional_id: input.profesionalId, sede_id: input.sedeId,
      dia_semana: dia, hora_inicio: input.horaInicio + ':00', hora_fin: input.horaFin + ':00',
    })
  }
  guardar(db)
  return { ok: 'Franja agregada.' }
}

export function borrarHorario(horarioId: string) {
  const db = cargar()
  db.horarios = db.horarios.filter((h) => h.id !== horarioId)
  guardar(db)
}

// ------------------------------------------------------------
// Mutaciones — perfiles y centro (UC-10, configuración)
// ------------------------------------------------------------

export function actualizarMisDatos(perfilId: string, campos: { nombre: string; especialidad: string | null; telefono: string | null }): Resultado {
  const db = cargar()
  const p = db.perfiles.find((x) => x.id === perfilId)
  if (!p) return { error: 'No encontramos el perfil.' }
  Object.assign(p, campos)
  guardar(db)
  return { ok: 'Datos actualizados.' }
}

export function cambiarClave(perfilId: string, nueva: string): Resultado {
  const db = cargar()
  const p = db.perfiles.find((x) => x.id === perfilId)
  if (!p) return { error: 'No encontramos el perfil.' }
  db.credenciales[p.email] = nueva
  p.debe_cambiar_password = false
  guardar(db)
  return { ok: 'Contraseña actualizada.' }
}

function claveTemporal(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)]
  return 'kine-' + out.slice(0, 4) + '-' + out.slice(4, 8)
}

export function crearProfesional(input: {
  centroId: string
  nombre: string
  email: string
  especialidad: string | null
  telefono: string | null
  rol: Rol
}): Resultado & { claveTemporal?: string } {
  const db = cargar()
  const correo = input.email.trim().toLowerCase()
  if (db.perfiles.some((p) => p.email === correo)) return { error: 'Ya existe una cuenta con ese email.' }

  const clave = claveTemporal()
  const perfilId = id()
  db.perfiles.push({
    id: perfilId, centro_id: input.centroId, nombre: input.nombre, email: correo, rol: input.rol,
    especialidad: input.especialidad, telefono: input.telefono, activo: true, debe_cambiar_password: true,
  })
  db.credenciales[correo] = clave
  guardar(db)
  return { ok: input.nombre + ' ya tiene cuenta y agenda propia.', claveTemporal: clave, id: perfilId }
}

export function cambiarActivoProfesional(perfilId: string, activo: boolean) {
  const db = cargar()
  const p = db.perfiles.find((x) => x.id === perfilId)
  if (p) {
    p.activo = activo
    guardar(db)
  }
}

export function cambiarRolProfesional(perfilId: string, rol: Rol) {
  const db = cargar()
  const p = db.perfiles.find((x) => x.id === perfilId)
  if (p) {
    p.rol = rol
    guardar(db)
  }
}

export function actualizarCentro(
  centroId: string,
  campos: { nombre: string; duracion_turno_min: number; kinesiologos_pueden_crear_turnos: boolean },
): Resultado {
  const db = cargar()
  const c = db.centros.find((x) => x.id === centroId)
  if (!c) return { error: 'No encontramos el centro.' }
  Object.assign(c, campos)
  guardar(db)
  return { ok: 'Datos del centro actualizados.' }
}
