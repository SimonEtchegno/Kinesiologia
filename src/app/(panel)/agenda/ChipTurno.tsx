import Link from 'next/link'
import { ESTADOS, nombreCompleto, tipoSesionDe, type TurnoExpandido } from '@/lib/dominio'
import { hhmm } from '@/lib/fechas'

/**
 * Bloque compacto de la grilla semanal.
 * El color de fondo dice **qué tipo de sesión** es (ingreso, traumatología,
 * respiratoria…); la barra de la izquierda y el puntito, en qué **estado**
 * está el turno.
 */
export default function ChipTurno({
  turno,
  mostrarProfesional,
}: {
  turno: TurnoExpandido
  mostrarProfesional?: boolean
}) {
  const tipo = tipoSesionDe(turno.tipo_sesion)
  const estado = ESTADOS[turno.estado]
  const cancelado = turno.estado === 'cancelado'

  return (
    <Link
      href={'/turnos/' + turno.id}
      className={
        'flex h-full flex-col overflow-hidden rounded-md border-l-[4px] px-1.5 py-1 text-[0.7rem] leading-tight ' +
        'ring-1 ring-inset transition-shadow hover:shadow-md ' +
        tipo.chip +
        ' ' +
        estado.borde +
        (cancelado ? ' opacity-60' : '')
      }
      title={
        hhmm(turno.hora_inicio) +
        '–' +
        hhmm(turno.hora_fin) +
        ' · ' +
        nombreCompleto(turno.paciente) +
        ' · ' +
        tipo.etiqueta +
        ' · ' +
        estado.etiqueta
      }
    >
      <span className="flex items-center gap-1">
        <span className="font-semibold tabular-nums opacity-80">{hhmm(turno.hora_inicio)}</span>
        <span className={'ml-auto size-1.5 shrink-0 rounded-full ' + estado.punto} />
      </span>
      <span className={'truncate font-semibold ' + (cancelado ? 'line-through' : '')}>
        {nombreCompleto(turno.paciente)}
      </span>
      <span className="truncate opacity-75">
        {tipo.corto}
        {mostrarProfesional && turno.profesional ? ' · ' + turno.profesional.nombre : ''}
      </span>
    </Link>
  )
}
