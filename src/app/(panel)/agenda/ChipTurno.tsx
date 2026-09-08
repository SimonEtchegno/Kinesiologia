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

  const detalle =
    hhmm(turno.hora_inicio) +
    '–' +
    hhmm(turno.hora_fin) +
    ' · ' +
    nombreCompleto(turno.paciente) +
    ' · ' +
    tipo.etiqueta +
    ' · ' +
    estado.etiqueta

  return (
    <div className="group/turno relative h-full">
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
        title={detalle}
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

      {/* Ese chip puede quedar angosto (hasta 4 turnos comparten el mismo
          horario): este popup muestra el detalle completo al pasar el cursor,
          sin depender del tooltip nativo del navegador. */}
      <div
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity delay-150 group-hover/turno:opacity-100"
      >
        <p className="font-semibold whitespace-nowrap">{nombreCompleto(turno.paciente)}</p>
        <p className="text-slate-300">
          {hhmm(turno.hora_inicio)}–{hhmm(turno.hora_fin)} · {tipo.etiqueta} · {estado.etiqueta}
          {mostrarProfesional && turno.profesional ? ' · ' + turno.profesional.nombre : ''}
        </p>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
      </div>
    </div>
  )
}
