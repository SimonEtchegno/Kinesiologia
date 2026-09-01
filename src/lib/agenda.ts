import type { HorarioAtencion, TurnoExpandido } from './dominio'
import { minutos } from './fechas'

/** Alto de la grilla: 1.2 px por minuto = 72 px por hora. */
export const PX_POR_MIN = 1.2

/** Si el profesional no declaró horarios, mostramos una jornada razonable. */
const RANGO_POR_DEFECTO = { desde: 8 * 60, hasta: 20 * 60 }

/**
 * Ventana horaria a dibujar: la unión de las franjas de atención y de los
 * turnos que haya (para que un turno fuera de horario igual se vea),
 * redondeada a la hora.
 */
export function ventanaHoraria(
  horarios: Pick<HorarioAtencion, 'hora_inicio' | 'hora_fin'>[],
  turnos: Pick<TurnoExpandido, 'hora_inicio' | 'hora_fin'>[],
): { desde: number; hasta: number } {
  const marcas: number[] = []
  for (const h of horarios) marcas.push(minutos(h.hora_inicio), minutos(h.hora_fin))
  for (const t of turnos) marcas.push(minutos(t.hora_inicio), minutos(t.hora_fin))

  if (marcas.length === 0) return RANGO_POR_DEFECTO

  const desde = Math.floor(Math.min(...marcas) / 60) * 60
  const hasta = Math.ceil(Math.max(...marcas) / 60) * 60

  // Mínimo 4 horas de alto, para que la grilla no quede raquítica.
  if (hasta - desde < 240) return { desde, hasta: desde + 240 }
  return { desde, hasta }
}

export interface Colocado {
  turno: TurnoExpandido
  /** Carril dentro del grupo de turnos superpuestos. */
  carril: number
  /** Cantidad de carriles del grupo (para repartir el ancho). */
  carriles: number
}

/**
 * Reparte en carriles los turnos que se superponen, para que en la vista
 * combinada del centro (UC-11) dos profesionales a la misma hora se vean
 * uno al lado del otro en vez de tapados.
 */
export function asignarCarriles(turnos: TurnoExpandido[]): Colocado[] {
  const ordenados = [...turnos].sort(
    (a, b) => minutos(a.hora_inicio) - minutos(b.hora_inicio) || minutos(a.hora_fin) - minutos(b.hora_fin),
  )

  const salida: Colocado[] = []
  let grupo: Colocado[] = []
  let finGrupo = -1

  const cerrarGrupo = () => {
    const carriles = grupo.reduce((max, c) => Math.max(max, c.carril + 1), 0)
    for (const c of grupo) salida.push({ ...c, carriles })
    grupo = []
    finGrupo = -1
  }

  for (const turno of ordenados) {
    const desde = minutos(turno.hora_inicio)
    const hasta = minutos(turno.hora_fin)

    // Arranca un grupo nuevo si no toca nada del grupo actual.
    if (grupo.length > 0 && desde >= finGrupo) cerrarGrupo()

    // Primer carril libre en este grupo.
    const ocupados = new Set(
      grupo
        .filter((c) => desde < minutos(c.turno.hora_fin) && hasta > minutos(c.turno.hora_inicio))
        .map((c) => c.carril),
    )
    let carril = 0
    while (ocupados.has(carril)) carril++

    grupo.push({ turno, carril, carriles: 1 })
    finGrupo = Math.max(finGrupo, hasta)
  }

  if (grupo.length > 0) cerrarGrupo()
  return salida
}

/** Posición vertical de un turno dentro de la grilla, en píxeles. */
export function posicion(turno: TurnoExpandido, desdeMin: number) {
  const inicio = minutos(turno.hora_inicio)
  const fin = minutos(turno.hora_fin)
  return {
    top: (inicio - desdeMin) * PX_POR_MIN,
    alto: Math.max((fin - inicio) * PX_POR_MIN, 26),
  }
}
