'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  IconoAgenda,
  IconoHistorial,
  IconoLapiz,
  IconoMail,
  IconoMas,
  IconoNota,
  IconoPacientes,
  IconoTelefono,
} from '@/componentes/Iconos'
import { ChipEstado, Dato, Encabezado, Vacio } from '@/componentes/ui'
import { COBERTURAS, iniciales, type Observacion, type Paciente, type Perfil, type TurnoExpandido } from '@/lib/dominio'
import { edad, formatearFechaCorta, formatearFechaLarga, hhmm } from '@/lib/fechas'
import * as almacen from '@/lib/local/almacen'
import Protegido from '@/lib/local/Protegido'
import type { Sesion } from '@/lib/local/sesion'
import { cambiarActivoPaciente } from '../acciones'

function Contenido({ sesion, pacienteId }: { sesion: Sesion; pacienteId: string }) {
  const [paciente, setPaciente] = useState<Paciente | null | undefined>(undefined)
  const [turnos, setTurnos] = useState<TurnoExpandido[]>([])
  const [observacionPorTurno, setObservacionPorTurno] = useState<Map<string, Observacion>>(new Map())
  const [profesionales, setProfesionales] = useState<Perfil[]>([])

  const recargar = useCallback(() => {
    const p = almacen.pacientePorId(pacienteId)
    setPaciente(p)
    if (p) {
      const { turnos, observacionPorTurno } = almacen.historialPaciente(pacienteId)
      setTurnos(turnos)
      setObservacionPorTurno(observacionPorTurno)
    }
    setProfesionales(almacen.listarProfesionales(sesion.centro.id, false))
  }, [pacienteId, sesion.centro.id])

  useEffect(recargar, [recargar])

  if (paciente === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-marca-200 border-t-marca-600" />
      </div>
    )
  }
  if (paciente === null) {
    return (
      <Vacio Icono={IconoPacientes} titulo="No encontramos al paciente" texto="Puede que haya sido eliminado." />
    )
  }

  const nombrePor = new Map(profesionales.map((p) => [p.id, p.nombre]))
  const realizados = turnos.filter((t) => t.estado === 'realizado')
  const ausentes = turnos.filter((t) => t.estado === 'ausente')
  const proximos = turnos
    .filter((t) => t.estado === 'confirmado' || t.estado === 'reprogramado')
    .sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio))
  const anios = edad(paciente.fecha_nacimiento)

  function alCambiarActivo(fd: FormData) {
    cambiarActivoPaciente(fd)
    recargar()
  }

  return (
    <>
      <Encabezado
        titulo={paciente.apellido + ', ' + paciente.nombre}
        descripcion={
          <>
            {paciente.cobertura === 'obra_social'
              ? (paciente.obra_social ?? COBERTURAS.obra_social)
              : COBERTURAS.particular}
            {anios != null ? ' · ' + anios + ' años' : ''}
            {!paciente.activo && ' · dado de baja'}
          </>
        }
        acciones={
          <>
            {sesion.puedeCargarTurnos && paciente.activo && (
              <Link
                href={'/turnos/nuevo?paciente=' + paciente.id}
                className="boton-primario boton-chico"
              >
                <IconoMas className="size-[1.05rem]" />
                Nuevo turno
              </Link>
            )}
            <Link
              href={'/pacientes/' + paciente.id + '/editar'}
              className="boton-secundario boton-chico"
            >
              <IconoLapiz className="size-4" />
              Editar
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <section className="tarjeta p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-marca-50 font-semibold text-marca-700">
                {iniciales(paciente.apellido + ' ' + paciente.nombre)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {paciente.nombre} {paciente.apellido}
                </p>
                <p className="text-xs text-slate-500">
                  Alta {formatearFechaCorta(paciente.created_at.slice(0, 10))}
                </p>
              </div>
            </div>

            <dl className="space-y-4">
              <Dato etiqueta="DNI">{paciente.dni ?? '—'}</Dato>
              <Dato etiqueta="Nacimiento">
                {paciente.fecha_nacimiento ? formatearFechaCorta(paciente.fecha_nacimiento) : '—'}
              </Dato>
              <Dato etiqueta="Teléfono">
                {paciente.telefono ? (
                  <a
                    href={'tel:' + paciente.telefono.replace(/\s/g, '')}
                    className="inline-flex items-center gap-1.5 text-marca-700 hover:underline"
                  >
                    <IconoTelefono className="size-4" />
                    {paciente.telefono}
                  </a>
                ) : (
                  '—'
                )}
              </Dato>
              <Dato etiqueta="Email">
                {paciente.email ? (
                  <a
                    href={'mailto:' + paciente.email}
                    className="inline-flex items-center gap-1.5 break-all text-marca-700 hover:underline"
                  >
                    <IconoMail className="size-4 shrink-0" />
                    {paciente.email}
                  </a>
                ) : (
                  '—'
                )}
              </Dato>
              <Dato etiqueta="Cobertura">
                {paciente.cobertura === 'obra_social'
                  ? (paciente.obra_social ?? COBERTURAS.obra_social)
                  : COBERTURAS.particular}
                {paciente.nro_afiliado && (
                  <span className="block text-xs text-slate-500">
                    Afiliado {paciente.nro_afiliado}
                  </span>
                )}
              </Dato>
              {paciente.notas && (
                <Dato etiqueta="Notas">
                  <span className="whitespace-pre-line">{paciente.notas}</span>
                </Dato>
              )}
            </dl>
          </section>

          <section className="tarjeta p-5">
            <p className="rotulo-seccion mb-3">Resumen</p>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div>
                <dd className="text-2xl font-semibold text-slate-900">{realizados.length}</dd>
                <dt className="text-xs text-slate-500">sesiones</dt>
              </div>
              <div>
                <dd className="text-2xl font-semibold text-rose-600">{ausentes.length}</dd>
                <dt className="text-xs text-slate-500">ausencias</dt>
              </div>
              <div>
                <dd className="text-2xl font-semibold text-marca-700">{proximos.length}</dd>
                <dt className="text-xs text-slate-500">próximos</dt>
              </div>
            </dl>
          </section>

          {proximos.length > 0 && (
            <section className="tarjeta p-5">
              <p className="rotulo-seccion mb-3">Próximos turnos</p>
              <ul className="space-y-2">
                {proximos.slice(0, 4).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={'/turnos/' + t.id}
                      className="flex items-baseline justify-between gap-2 text-sm hover:underline"
                    >
                      <span className="font-medium text-slate-800 first-letter:uppercase">
                        {formatearFechaLarga(t.fecha)}
                      </span>
                      <span className="tabular-nums text-slate-500">{hhmm(t.hora_inicio)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <form action={alCambiarActivo} className="no-imprimir">
            <input type="hidden" name="id" value={paciente.id} />
            <input type="hidden" name="activo" value={paciente.activo ? 'no' : 'si'} />
            <button
              type="submit"
              className={(paciente.activo ? 'boton-peligro' : 'boton-secundario') + ' boton-chico w-full'}
            >
              {paciente.activo ? 'Dar de baja al paciente' : 'Reactivar al paciente'}
            </button>
          </form>
        </div>

        <section className="tarjeta">
          <div className="flex items-center gap-2 border-b border-linea px-5 py-4">
            <IconoHistorial className="size-5 text-slate-400" />
            <h2 className="font-semibold text-slate-900">Historial</h2>
            <span className="ml-auto text-xs text-slate-500">
              {turnos.length} {turnos.length === 1 ? 'turno' : 'turnos'}
            </span>
          </div>

          {turnos.length === 0 ? (
            <Vacio
              Icono={IconoAgenda}
              titulo="Sin turnos todavía"
              texto="Cuando le cargues el primer turno, acá va a quedar todo el recorrido del paciente."
              accion={
                sesion.puedeCargarTurnos ? (
                  <Link
                    href={'/turnos/nuevo?paciente=' + paciente.id}
                    className="boton-primario boton-chico"
                  >
                    Cargar un turno
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <ol className="divide-y divide-linea">
              {turnos.map((t) => {
                const obs = observacionPorTurno.get(t.id)
                return (
                  <li key={t.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Link
                        href={'/turnos/' + t.id}
                        className="font-medium text-slate-900 first-letter:uppercase hover:text-marca-700 hover:underline"
                      >
                        {formatearFechaLarga(t.fecha)}
                      </Link>
                      <span className="text-sm tabular-nums text-slate-500">
                        {hhmm(t.hora_inicio)}–{hhmm(t.hora_fin)}
                      </span>
                      <ChipEstado estado={t.estado} />
                      <span className="ml-auto text-xs text-slate-400">
                        {t.tipo_sesion}
                        {t.profesional ? ' · ' + t.profesional.nombre : ''}
                      </span>
                    </div>

                    {obs && (
                      <div className="mt-3 rounded-lg border border-linea bg-slate-50/70 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <IconoNota className="size-4 text-marca-600" />
                          <p className="text-xs font-semibold text-slate-600">
                            Observación de {nombrePor.get(obs.profesional_id) ?? 'el profesional'}
                          </p>
                          {obs.dolor_referido != null && (
                            <span className="chip ml-auto bg-white text-slate-600 ring-slate-200">
                              Dolor {obs.dolor_referido}/10
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-line text-sm text-slate-700">{obs.evolucion}</p>
                        {obs.ejercicios_indicados && (
                          <p className="mt-2 text-sm text-slate-600">
                            <span className="font-semibold">Ejercicios: </span>
                            <span className="whitespace-pre-line">{obs.ejercicios_indicados}</span>
                          </p>
                        )}
                        {obs.proxima_sesion_sugerida && (
                          <p className="mt-2 text-sm text-slate-600">
                            <span className="font-semibold">Próxima sesión: </span>
                            {obs.proxima_sesion_sugerida}
                          </p>
                        )}
                      </div>
                    )}

                    {t.estado === 'realizado' && !obs && (
                      <p className="mt-2 text-xs text-amber-700">
                        Sesión sin observación cargada.
                        {t.profesional_id === sesion.perfil.id && (
                          <Link href={'/turnos/' + t.id + '#observacion'} className="ml-1 underline">
                            Cargarla ahora
                          </Link>
                        )}
                      </p>
                    )}

                    {t.motivo && (
                      <p className="mt-2 text-xs text-slate-500">Motivo: {t.motivo}</p>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}

export default function PaginaPaciente() {
  const params = useParams<{ id: string }>()
  return <Protegido>{(sesion) => <Contenido sesion={sesion} pacienteId={params.id} />}</Protegido>
}
