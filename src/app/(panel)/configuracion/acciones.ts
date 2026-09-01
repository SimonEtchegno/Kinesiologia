import * as almacen from '@/lib/local/almacen'
import { esHora, minutos } from '@/lib/fechas'
import type { Sesion } from '@/lib/local/sesion'

export interface Resultado {
  error?: string
  ok?: string
  id?: string
  claveTemporal?: string
}

// ============================================================
// UC-09 — Horarios de atención
// ============================================================
export function agregarHorario(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
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

  return almacen.agregarHorario({ profesionalId, sedeId, dias, horaInicio: inicio, horaFin: fin })
}

export function borrarHorario(datos: FormData): void {
  const id = String(datos.get('id') ?? '')
  if (id) almacen.borrarHorario(id)
}

// ============================================================
// Mis datos
// ============================================================
export function actualizarMisDatos(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const nombre = String(datos.get('nombre') ?? '').trim()
  if (!nombre) return { error: 'El nombre no puede quedar vacío.' }

  return almacen.actualizarMisDatos(sesion.perfil.id, {
    nombre,
    especialidad: String(datos.get('especialidad') ?? '').trim() || null,
    telefono: String(datos.get('telefono') ?? '').trim() || null,
  })
}

// ============================================================
// Contraseña
// ============================================================
export function cambiarClave(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const nueva = String(datos.get('nueva') ?? '')
  const repetir = String(datos.get('repetir') ?? '')

  if (nueva.length < 8) return { error: 'La contraseña tiene que tener al menos 8 caracteres.' }
  if (nueva !== repetir) return { error: 'Las dos contraseñas no coinciden.' }

  return almacen.cambiarClave(sesion.perfil.id, nueva)
}

// ============================================================
// UC-10 — Dar de alta un kinesiólogo
// ============================================================
export function crearProfesional(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const nombre = String(datos.get('nombre') ?? '').trim()
  const email = String(datos.get('email') ?? '').trim().toLowerCase()
  const especialidad = String(datos.get('especialidad') ?? '').trim() || null
  const telefono = String(datos.get('telefono') ?? '').trim() || null
  const rol = String(datos.get('rol') ?? 'kinesiologo') === 'admin' ? 'admin' : 'kinesiologo'

  if (!nombre) return { error: 'Poné el nombre del profesional.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El email no parece válido.' }

  return almacen.crearProfesional({ centroId: sesion.centro.id, nombre, email, especialidad, telefono, rol })
}

export function cambiarActivoProfesional(sesion: Sesion, datos: FormData): void {
  const id = String(datos.get('id') ?? '')
  const activo = datos.get('activo') === 'si'
  if (!id || id === sesion.perfil.id) return
  almacen.cambiarActivoProfesional(id, activo)
}

/** El admin no puede cambiarse el rol a sí mismo: se quedaría afuera del panel. */
export function cambiarRolProfesional(sesion: Sesion, datos: FormData): void {
  const id = String(datos.get('id') ?? '')
  const rol = String(datos.get('rol') ?? '') === 'admin' ? 'admin' : 'kinesiologo'
  if (!id || id === sesion.perfil.id) return
  almacen.cambiarRolProfesional(id, rol)
}

// ============================================================
// Sedes
// ============================================================
export function crearSede(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const nombre = String(datos.get('nombre') ?? '').trim()
  const direccion = String(datos.get('direccion') ?? '').trim() || null

  if (!nombre) return { error: 'Poné el nombre de la sede.' }

  return almacen.crearSede(sesion.centro.id, nombre, direccion)
}

export function cambiarActivaSede(datos: FormData): void {
  const id = String(datos.get('id') ?? '')
  const activa = datos.get('activa') === 'si'
  if (id) almacen.cambiarActivaSede(id, activa)
}

// ============================================================
// Datos del centro
// ============================================================
export function actualizarCentro(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const nombre = String(datos.get('nombre') ?? '').trim()
  const duracion = Number(datos.get('duracion_turno_min') ?? 45)
  const permite = datos.get('kinesiologos_pueden_crear_turnos') === 'si'

  if (!nombre) return { error: 'El nombre del centro no puede quedar vacío.' }
  if (!Number.isInteger(duracion) || duracion < 10 || duracion > 240) {
    return { error: 'La duración por defecto tiene que estar entre 10 y 240 minutos.' }
  }

  return almacen.actualizarCentro(sesion.centro.id, {
    nombre,
    duracion_turno_min: duracion,
    kinesiologos_pueden_crear_turnos: permite,
  })
}
