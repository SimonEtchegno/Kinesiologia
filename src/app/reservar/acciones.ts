import { esHora, esISO } from '@/lib/fechas'
import * as almacen from '@/lib/local/almacen'
import type { Cobertura } from '@/lib/dominio'

export interface ResultadoReserva {
  error?: string
  ok?: string
  id?: string
}

/**
 * Reserva desde la página pública (sin sesión). Toda la validación fuerte
 * vive en el almacén: acá solo se leen y limpian los campos del formulario.
 */
export function reservarTurno(
  centroId: string,
  _previo: ResultadoReserva,
  datos: FormData,
): ResultadoReserva {
  const profesionalId = String(datos.get('profesional_id') ?? '')
  const fecha = String(datos.get('fecha') ?? '')
  const horaInicio = String(datos.get('hora_inicio') ?? '')
  const sedeId = String(datos.get('sede_id') ?? '') || null

  if (!profesionalId) return { error: 'Elegí con quién querés atenderte.' }
  if (!esISO(fecha)) return { error: 'Elegí una fecha.' }
  if (!esHora(horaInicio)) return { error: 'Elegí un horario de los que están libres.' }

  const cobertura = String(datos.get('cobertura') ?? 'particular') as Cobertura

  return almacen.reservarTurnoPublico({
    centroId,
    profesionalId,
    fecha,
    horaInicio,
    sedeId,
    nombre: String(datos.get('nombre') ?? ''),
    apellido: String(datos.get('apellido') ?? ''),
    telefono: String(datos.get('telefono') ?? ''),
    email: String(datos.get('email') ?? '').trim() || null,
    dni: String(datos.get('dni') ?? '').trim() || null,
    cobertura: cobertura === 'obra_social' ? 'obra_social' : 'particular',
    obraSocial: String(datos.get('obra_social') ?? '').trim() || null,
    primeraVez: datos.get('primera_vez') === 'si',
    comentario: String(datos.get('comentario') ?? '').trim() || null,
  })
}
