import type { Metadata } from 'next'
import Link from 'next/link'
import {
  IconoCheck,
  IconoHistorial,
  IconoNota,
  IconoPacientes,
  IconoReloj,
  IconoSede,
  IconoX,
} from '@/componentes/Iconos'
import EnviarWhatsApp from '@/componentes/EnviarWhatsApp'
import { ChipEstado, Dato, Encabezado, Vacio } from '@/componentes/ui'
import {
  COBERTURAS,
  ESTADOS_CERRADOS,
  nombreCompleto,
  tipoSesionDe,
} from '@/lib/dominio'
import {
  eventosDeTurno,
  listarProfesionales,
  observacionDeTurno,
  slotsDisponibles,
  turnoPorId,
} from '@/lib/datos'
import { formatearFechaCorta, formatearFechaLarga, hhmm, minutos, yaPaso } from '@/lib/fechas'
import { exigirSesion } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'
import { mensajeSegunTipo } from '@/lib/whatsapp'
import { marcarTurno } from '../acciones'
import AccionesTurno from './AccionesTurno'
import CambiarTipo from './CambiarTipo'
import FormObservacion from './FormObservacion'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: turnoId } = await params
  const supabase = await clienteServidor()
  const turno = await turnoPorId(supabase, turnoId)

  if (!turno) {
    return { title: 'Turno no encontrado' }
  }

  const paciente = nombreCompleto(turno.paciente)
  return {
    title: `${paciente} · ${formatearFechaCorta(turno.fecha)}`,
  }
}

const ETIQUETA_EVENTO: Record<string, string> = {
  creado: 'Turno creado',
  reprogramado: 'Reprogramado',
  cancelado: 'Cancelado',
  realizado: 'Marcado como realizado',
  ausente: 'Marcado como ausente',
  observacion: 'Observación clínica cargada',
  tipo: 'Tipo de sesión cambiado',
  reserva: 'Reservado desde la página pública',
}

export default async function PaginaTurno({ params }: { params: Promise<{ id: string }> }) {
  const { id: turnoId } = await params
  const sesion = await exigirSesion()
  const supabase = await clienteServidor()

  const turno = await turnoPorId(supabase, turnoId)

  if (!turno) {
    return (
      <Vacio
        Icono={IconoPacientes}
        titulo="No encontramos el turno"
        texto="Puede que haya sido eliminado."
        accion={
          <Link href="/agenda" className="boton-secundario boton-chico">
            Volver a la agenda
          </Link>
        }
      />
    )
  }

  const puedeEditar = turno.profesional_id === sesion.perfil.id || sesion.esAdmin
  const abierto = !ESTADOS_CERRADOS.includes(turno.estado)
  const llego = yaPaso(turno.fecha, hhmm(turno.hora_inicio))
  const duracion = minutos(turno.hora_fin) - minutos(turno.hora_inicio)
  const tipo = tipoSesionDe(turno.tipo_sesion)

  const [observacion, eventos, profesionales, libres] = await Promise.all([
    observacionDeTurno(supabase, turnoId),
    eventosDeTurno(supabase, turnoId),
    listarProfesionales(supabase, false),
    abierto && puedeEditar
      ? slotsDisponibles(supabase, turno.profesional_id, turno.fecha, duracion, turno.id).then((d) => d.libres)
      : Promise.resolve([]),
  ])

  const nombrePor = new Map(profesionales.map((p) => [p.id, p.nombre]))

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado
        titulo={nombreCompleto(turno.paciente)}
        descripcion={
          <span className="first-letter:uppercase">
            {formatearFechaLarga(turno.fecha)} · {hhmm(turno.hora_inicio)}–{hhmm(turno.hora_fin)}
          </span>
        }
        acciones={
          <>
            <EnviarWhatsApp
              telefono={turno.paciente?.telefono ?? null}
              etiqueta="WhatsApp"
              mensaje={mensajeSegunTipo({
                centro: sesion.centro.nombre,
                paciente: turno.paciente ? turno.paciente.nombre : 'paciente',
                profesional: turno.profesional?.nombre,
                fecha: turno.fecha,
                hora: hhmm(turno.hora_inicio),
                sede: turno.sede?.nombre,
                tipo: turno.tipo_sesion,
              })}
            />
            <Link href={'/pacientes/' + turno.paciente_id} className="boton-secundario boton-chico">
              Ver ficha
            </Link>
            <Link href={'/agenda?fecha=' + turno.fecha + '&vista=dia'} className="boton-fantasma boton-chico">
              Volver a la agenda
            </Link>
          </>
        }
      />

      <div className="space-y-5">
        <section className="tarjeta p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">El turno</h2>
            <ChipEstado estado={turno.estado} />
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato etiqueta="Profesional">{turno.profesional?.nombre ?? '—'}</Dato>
            <Dato etiqueta="Tipo de sesión">
              <div className="flex flex-wrap items-center gap-2">
                <span className={'chip ' + tipo.chip}>
                  <span className={'size-1.5 rounded-full ' + tipo.punto} />
                  {tipo.etiqueta}
                </span>
                {puedeEditar && turno.estado !== 'cancelado' && (
                  <CambiarTipo turnoId={turno.id} tipoActual={turno.tipo_sesion} />
                )}
              </div>
            </Dato>
            <Dato etiqueta="Duración">{duracion} minutos</Dato>
            <Dato etiqueta="Cobertura">
              {turno.paciente?.cobertura === 'obra_social'
                ? (turno.paciente.obra_social ?? COBERTURAS.obra_social)
                : COBERTURAS.particular}
            </Dato>
            <Dato etiqueta="Cómo se cargó">
              {turno.origen === 'online' ? 'El paciente lo reservó online' : 'Lo cargó el centro'}
            </Dato>
            {turno.sede && (
              <Dato etiqueta="Sede">
                <span className="inline-flex items-center gap-1.5">
                  <IconoSede className="size-4 text-slate-400" />
                  {turno.sede.nombre}
                </span>
              </Dato>
            )}
            {turno.motivo && <Dato etiqueta="Motivo">{turno.motivo}</Dato>}
          </dl>
        </section>

        {puedeEditar && turno.estado !== 'cancelado' && (
          <section className="tarjeta p-5">
            <h2 className="mb-1 font-semibold text-slate-900">¿Cómo salió la sesión?</h2>
            <p className="subtitulo mb-4">
              {llego
                ? 'Marcá si el paciente vino o no. Si vino, podés cargar la observación abajo.'
                : 'Vas a poder marcarlo cuando llegue la hora del turno.'}
            </p>

            <div className="flex flex-wrap gap-2">
              <form action={marcarTurno}>
                <input type="hidden" name="turno_id" value={turno.id} />
                <input type="hidden" name="estado" value="realizado" />
                <button type="submit" disabled={!llego || turno.estado === 'realizado'} className="boton-acento boton-chico">
                  <IconoCheck className="size-4" />
                  {turno.estado === 'realizado' ? 'Realizado' : 'Marcar realizado'}
                </button>
              </form>

              <form action={marcarTurno}>
                <input type="hidden" name="turno_id" value={turno.id} />
                <input type="hidden" name="estado" value="ausente" />
                <button type="submit" disabled={!llego || turno.estado === 'ausente'} className="boton-secundario boton-chico">
                  <IconoX className="size-4" />
                  {turno.estado === 'ausente' ? 'Ausente' : 'Marcar ausente'}
                </button>
              </form>
            </div>
          </section>
        )}

        {puedeEditar && abierto && (
          <section className="tarjeta p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
              <IconoReloj className="size-5 text-slate-400" />
              Cambios en el turno
            </h2>
            <AccionesTurno
              turnoId={turno.id}
              fecha={turno.fecha}
              horaActual={hhmm(turno.hora_inicio)}
              libres={libres}
            />
          </section>
        )}

        {turno.estado === 'realizado' && puedeEditar && (
          <FormObservacion turnoId={turno.id} observacion={observacion} />
        )}

        {turno.estado === 'realizado' && !puedeEditar && observacion && (
          <section className="tarjeta p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
              <IconoNota className="size-5 text-marca-600" />
              Observación de la sesión
            </h2>
            <dl className="grid gap-4">
              <Dato etiqueta="Evolución">
                <span className="whitespace-pre-line">{observacion.evolucion}</span>
              </Dato>
              {observacion.dolor_referido != null && (
                <Dato etiqueta="Dolor referido">{observacion.dolor_referido} / 10</Dato>
              )}
              {observacion.ejercicios_indicados && (
                <Dato etiqueta="Ejercicios indicados">
                  <span className="whitespace-pre-line">{observacion.ejercicios_indicados}</span>
                </Dato>
              )}
              {observacion.proxima_sesion_sugerida && (
                <Dato etiqueta="Próxima sesión">{observacion.proxima_sesion_sugerida}</Dato>
              )}
            </dl>
          </section>
        )}

        {turno.estado !== 'realizado' && turno.estado !== 'cancelado' && (
          <p className="text-sm text-slate-500">
            La observación clínica se habilita cuando el turno queda marcado como realizado.
          </p>
        )}

        <section className="tarjeta p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <IconoHistorial className="size-5 text-slate-400" />
            Historial del turno
          </h2>
          <ol className="space-y-3">
            {eventos.map((ev) => (
              <li key={ev.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-300" />
                <div>
                  <p className="font-medium text-slate-800">{ETIQUETA_EVENTO[ev.tipo] ?? ev.tipo}</p>
                  {ev.detalle && <p className="text-slate-500">{ev.detalle}</p>}
                  <p className="text-xs text-slate-400">
                    {formatearFechaCorta(ev.created_at.slice(0, 10))}
                    {' · '}
                    {new Date(ev.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    {ev.usuario_id ? ' · ' + (nombrePor.get(ev.usuario_id) ?? '—') : ''}
                  </p>
                </div>
              </li>
            ))}
            {eventos.length === 0 && <li className="text-sm text-slate-500">Sin movimientos.</li>}
          </ol>
        </section>
      </div>
    </div>
  )
}
