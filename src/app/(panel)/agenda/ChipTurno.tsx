import Link from 'next/link'
import { ESTADOS, nombreCompleto, type TurnoExpandido } from '@/lib/dominio'
import { hhmm } from '@/lib/fechas'

/** Bloque compacto de la grilla semanal. */
export default function ChipTurno({
  turno,
  mostrarProfesional,
}: {
  turno: TurnoExpandido
  mostrarProfesional?: boolean
}) {
  const { chip, borde } = ESTADOS[turno.estado]
  const tachado = turno.estado === 'cancelado' ? 'line-through' : ''

  return (
    <Link
      href={'/turnos/' + turno.id}
      className={
        'flex h-full flex-col overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-[0.7rem] leading-tight ' +
        'ring-1 ring-inset transition-shadow hover:shadow-md ' +
        chip +
        ' ' +
        borde
      }
      title={
        hhmm(turno.hora_inicio) +
        '–' +
        hhmm(turno.hora_fin) +
        ' · ' +
        nombreCompleto(turno.paciente) +
        ' · ' +
        turno.tipo_sesion
      }
    >
      <span className="font-semibold tabular-nums opacity-80">{hhmm(turno.hora_inicio)}</span>
      <span className={'truncate font-semibold ' + tachado}>
        {nombreCompleto(turno.paciente)}
      </span>
      {mostrarProfesional && turno.profesional && (
        <span className="truncate opacity-75">{turno.profesional.nombre}</span>
      )}
    </Link>
  )
}
