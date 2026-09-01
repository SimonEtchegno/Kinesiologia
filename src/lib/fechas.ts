// ------------------------------------------------------------
// Fechas y horas como texto ("YYYY-MM-DD", "HH:MM").
// Nunca convertimos a UTC: un turno de 9:00 es 9:00 en el consultorio,
// sin importar dónde corra el servidor.
// ------------------------------------------------------------

export const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/** Fecha de hoy en horario local, como YYYY-MM-DD. */
export function hoyISO(): string {
  return aISO(new Date())
}

export function aISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + mes + '-' + dia
}

/** Parsea YYYY-MM-DD como fecha local (new Date("2026-01-05") sería UTC). */
export function desdeISO(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a!, (m ?? 1) - 1, d ?? 1)
}

export function esISO(valor: unknown): valor is string {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
}

export function sumarDias(iso: string, dias: number): string {
  const d = desdeISO(iso)
  d.setDate(d.getDate() + dias)
  return aISO(d)
}

export function diaSemana(iso: string): number {
  return desdeISO(iso).getDay()
}

/** Lunes de la semana que contiene a `iso`. */
export function inicioSemana(iso: string): string {
  const dow = diaSemana(iso)
  const offset = dow === 0 ? -6 : 1 - dow
  return sumarDias(iso, offset)
}

/** Los 7 días (lunes a domingo) de la semana de `iso`. */
export function semanaDe(iso: string): string[] {
  const lunes = inicioSemana(iso)
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

export function formatearFechaLarga(iso: string): string {
  const d = desdeISO(iso)
  return DIAS_SEMANA[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]
}

export function formatearFechaCorta(iso: string): string {
  const d = desdeISO(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return dd + '/' + mm + '/' + d.getFullYear()
}

export function formatearRangoSemana(iso: string): string {
  const dias = semanaDe(iso)
  const a = desdeISO(dias[0]!)
  const b = desdeISO(dias[6]!)
  if (a.getMonth() === b.getMonth()) {
    return a.getDate() + ' al ' + b.getDate() + ' de ' + MESES[b.getMonth()] + ' de ' + b.getFullYear()
  }
  return (
    a.getDate() +
    ' de ' +
    MESES[a.getMonth()] +
    ' al ' +
    b.getDate() +
    ' de ' +
    MESES[b.getMonth()] +
    ' de ' +
    b.getFullYear()
  )
}

// ------------------------------------------------------------
// Horas
// ------------------------------------------------------------

/** "09:00:00" -> "09:00" */
export function hhmm(hora: string): string {
  return hora.slice(0, 5)
}

export function minutos(hora: string): number {
  const [h, m] = hhmm(hora).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function desdeMinutos(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

export function sumarMinutos(hora: string, delta: number): string {
  return desdeMinutos(minutos(hora) + delta)
}

export function esHora(valor: unknown): valor is string {
  return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
}

/** true si el momento fecha+hora ya llegó o pasó (precondición de UC-05). */
export function yaPaso(fecha: string, hora: string): boolean {
  const objetivo = desdeISO(fecha)
  objetivo.setMinutes(minutos(hora))
  return objetivo.getTime() <= Date.now()
}

/** Grilla de horarios cada `paso` minutos, entre dos horas. */
export function grillaHoraria(desde: string, hasta: string, paso: number): string[] {
  const salida: string[] = []
  for (let m = minutos(desde); m + paso <= minutos(hasta); m += paso) {
    salida.push(desdeMinutos(m))
  }
  return salida
}

export function edad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null
  const n = desdeISO(fechaNacimiento)
  const hoy = new Date()
  let e = hoy.getFullYear() - n.getFullYear()
  const m = hoy.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e--
  return e >= 0 && e < 130 ? e : null
}
