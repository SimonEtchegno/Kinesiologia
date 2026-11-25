import Link from 'next/link'
import { ESTADOS, nombreCompleto, tipoSesionDe, type TurnoExpandido } from '@/lib/dominio'
import { hhmm } from '@/lib/fechas'

/**
 * Bloque compacto de la grilla semanal.
 * El color de fondo dice **qué tipo de sesión** es (ingreso, traumatología,
 * respiratoria…); la barra de la izquierda y el puntito, en qué **estado**
 * está el turno.
 *
 * El contenido se adapta al alto disponible para que nunca quede texto
 * cortado a la mitad:
 * - muy corto (< 34 px): una sola línea con hora y paciente;
 * - corto (< 50 px): hora + paciente arriba, tipo de sesión abajo;
 * - normal: hora, paciente y tipo en tres líneas.
 */
export default function ChipTurno({
  turno,
  alto,
  mostrarProfesional,
  miId,
}: {
  turno: TurnoExpandido
  /** Alto en px del bloque, para elegir cuánta información entra. */
  alto: number
  mostrarProfesional?: boolean
  /** Para marcar los turnos que aparecen pero atiende otra profesional. */
  miId?: string
}) {
  const tipo = tipoSesionDe(turno.tipo_sesion)
  const estado = ESTADOS[turno.estado]
  const cancelado = turno.estado === 'cancelado'
  // Aparece en mi agenda pero lo atiende otra: lo cargué yo para ella.
  const paraOtra = !!miId && turno.profesional_id !== miId
  const nombreProf = turno.profesional?.nombre
  const paciente = nombreCompleto(turno.paciente)

  const titulo =
    hhmm(turno.hora_inicio) +
    '–' +
    hhmm(turno.hora_fin) +
    ' · ' +
    paciente +
    ' · ' +
    tipo.etiqueta +
    ' · ' +
    estado.etiqueta +
    (paraOtra && nombreProf ? ' · para ' + nombreProf : '')

  const subtitulo =
    paraOtra && nombreProf
      ? 'Para ' + nombreProf
      : tipo.corto + (mostrarProfesional && nombreProf ? ' · ' + nombreProf : '')

  const lineas = alto < 34 ? 1 : alto < 50 ? 2 : 3

  const hora = (
    <span className="shrink-0 font-semibold tabular-nums opacity-70">{hhmm(turno.hora_inicio)}</span>
  )
  const nombre = (
    <span className={'min-w-0 truncate font-semibold ' + (cancelado ? 'line-through' : '')}>
      {paciente}
    </span>
  )
  const punto = <span className={'size-1.5 shrink-0 rounded-full ' + estado.punto} />
  const linea2 = <span className="truncate opacity-70">{subtitulo}</span>

  return (
    <div className="group/turno relative h-full">
      <Link
        href={'/turnos/' + turno.id}
        className={
          'flex h-full flex-col gap-px overflow-hidden rounded-md border-l-[3px] px-2 ' +
          'text-[0.7rem] leading-[1.2] ring-1 ring-inset transition-shadow hover:shadow-md ' +
          (lineas === 3 ? 'justify-start py-1.5 ' : 'justify-center py-0.5 ') +
          tipo.chip +
          ' ' +
          estado.borde +
          (cancelado ? ' opacity-60' : '')
        }
        title={titulo}
      >
        {lineas === 3 ? (
          <>
            <span className="flex items-center gap-1.5">
              {hora}
              <span className="ml-auto">{punto}</span>
            </span>
            {nombre}
            {linea2}
          </>
        ) : (
          <>
            <span className="flex min-w-0 items-center gap-1.5">
              {hora}
              {nombre}
              <span className="ml-auto">{punto}</span>
            </span>
            {lineas === 2 && linea2}
          </>
        )}
      </Link>

      {/* Ese chip puede quedar angosto (hasta 4 turnos comparten el mismo
          horario): este popup muestra el detalle completo al pasar el cursor,
          sin depender del tooltip nativo del navegador. */}
      <div
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity delay-150 group-hover/turno:opacity-100"
      >
        <p className="font-semibold whitespace-nowrap">{paciente}</p>
        {paraOtra && nombreProf && (
          <p className="font-semibold text-amber-300">Lo atiende {nombreProf}</p>
        )}
        <p className="text-slate-300">
          {hhmm(turno.hora_inicio)}–{hhmm(turno.hora_fin)} · {tipo.etiqueta} · {estado.etiqueta}
          {!paraOtra && mostrarProfesional && nombreProf ? ' · ' + nombreProf : ''}
        </p>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
      </div>
    </div>
  )
}
