'use client'

import Link from 'next/link'
import {
  IconoAgenda,
  IconoCheck,
  IconoFlechaDerecha,
  IconoNota,
  IconoSede,
  IconoX,
} from '@/componentes/Iconos'
import { ChipEstado, Vacio } from '@/componentes/ui'
import {
  COBERTURAS,
  iniciales,
  tipoSesionDe,
  type TurnoExpandido,
} from '@/lib/dominio'
import { hhmm, yaPaso } from '@/lib/fechas'
import type { Sesion } from '@/lib/sesion'
import { marcarTurno } from '../turnos/acciones'

interface Props {
  turnos: TurnoExpandido[]
  mostrarProfesional: boolean
  sesion: Sesion
  fecha: string
}

function capitalizar(texto?: string | null) {
  if (!texto) return ''
  return texto
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function VistaDia({
  turnos,
  mostrarProfesional,
  sesion,
  fecha,
}: Props) {
  const usuarioId = sesion.perfil.id
  const esAdmin = sesion.esAdmin
  const puedeCargarTurnos = sesion.puedeCargarTurnos

  if (turnos.length === 0) {
    return (
      <div className="tarjeta-sombra">
        <Vacio
          Icono={IconoAgenda}
          titulo="No hay turnos para este día"
          texto="Los turnos programados para esta fecha se mostrarán aquí ordenados cronológicamente."
          accion={
            puedeCargarTurnos ? (
              <Link
                href={'/turnos/nuevo?fecha=' + fecha}
                className="boton-primario boton-chico"
              >
                Cargar un turno
              </Link>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {turnos.map((t) => {
        const propio = t.profesional_id === usuarioId
        const puedeMarcar =
          (propio || esAdmin) &&
          t.estado !== 'cancelado' &&
          yaPaso(t.fecha, hhmm(t.hora_inicio))

        const tipo = tipoSesionDe(t.tipo_sesion)

        const nombrePaciente = t.paciente
          ? `${capitalizar(t.paciente.apellido)}, ${capitalizar(t.paciente.nombre)}`
          : 'Paciente sin datos'

        const avatarIniciales = t.paciente
          ? iniciales(`${t.paciente.nombre} ${t.paciente.apellido}`)
          : '?'

        return (
          <li
            key={t.id}
            className="tarjeta-sombra group relative flex flex-col gap-4 overflow-hidden p-4 sm:flex-row sm:items-center sm:gap-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-marca-300 dark:hover:border-marca-700/60"
          >
            {/* Barra lateral indicadora del tipo de sesión */}
            <div
              className={
                'absolute inset-y-0 left-0 w-1.5 sm:w-2 transition-colors ' +
                (tipo.punto || 'bg-marca-500')
              }
            />

            {/* Bloque horario + Avatar */}
            <div className="flex items-center gap-3 pl-1.5 sm:pl-1">
              {/* Horario en cápsula */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-linea bg-slate-50/90 px-3 py-2 text-center shadow-2xs dark:bg-slate-800/90 min-w-[5.25rem] shrink-0">
                <span className="text-base font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                  {hhmm(t.hora_inicio)}
                </span>
                <span className="text-[0.7rem] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                  hasta {hhmm(t.hora_fin)}
                </span>
              </div>

              {/* Avatar con iniciales */}
              <div className="grid size-9.5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-marca-100 to-marca-200 text-xs font-bold text-marca-800 ring-2 ring-white shadow-2xs dark:from-marca-950 dark:to-marca-900 dark:text-marca-300 dark:ring-slate-800">
                {avatarIniciales}
              </div>
            </div>

            {/* Información del paciente y sesión */}
            <div className="min-w-0 flex-1 pl-1.5 sm:pl-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                <Link
                  href={'/pacientes/' + t.paciente_id}
                  className="text-base font-bold text-slate-900 transition-colors hover:text-marca-600 dark:text-white dark:hover:text-marca-400"
                >
                  {nombrePaciente}
                </Link>
              </div>

              {/* Etiquetas y chips */}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className={'chip ' + tipo.chip}>
                  <span className={'size-1.5 rounded-full ' + tipo.punto} />
                  {tipo.etiqueta}
                </span>

                {t.paciente && (
                  <span className="rounded-full border border-slate-200 bg-slate-100/70 px-2.5 py-0.5 font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {t.paciente.cobertura === 'obra_social'
                      ? (t.paciente.obra_social ?? COBERTURAS.obra_social)
                      : COBERTURAS.particular}
                  </span>
                )}

                {t.origen === 'online' && (
                  <span className="chip bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800">
                    Reserva online
                  </span>
                )}
              </div>

              {/* Metadatos: Profesional y Sede */}
              {(mostrarProfesional || t.sede) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-400 dark:text-slate-500">
                  {mostrarProfesional && t.profesional && (
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                      Kgo. {t.profesional.nombre}
                    </span>
                  )}
                  {t.sede && (
                    <span className="inline-flex items-center gap-1">
                      <IconoSede className="size-3.5 text-slate-400" />
                      {t.sede.nombre}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Estado del turno */}
            <div className="shrink-0 pl-1.5 sm:pl-0">
              <ChipEstado estado={t.estado} />
            </div>

            {/* Botones de acción rápida */}
            <div className="flex flex-wrap items-center gap-2 pl-1.5 sm:pl-0 no-imprimir sm:ml-auto">
              {puedeMarcar && t.estado !== 'realizado' && (
                <form action={marcarTurno}>
                  <input type="hidden" name="turno_id" value={t.id} />
                  <input type="hidden" name="estado" value="realizado" />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-emerald-700 active:scale-95"
                  >
                    <IconoCheck className="size-3.5" />
                    <span>Realizado</span>
                  </button>
                </form>
              )}

              {puedeMarcar && t.estado !== 'ausente' && (
                <form action={marcarTurno}>
                  <input type="hidden" name="turno_id" value={t.id} />
                  <input type="hidden" name="estado" value="ausente" />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  >
                    <IconoX className="size-3.5" />
                    <span>Ausente</span>
                  </button>
                </form>
              )}

              {t.estado === 'realizado' && (propio || esAdmin) && (
                <Link
                  href={'/turnos/' + t.id + '#observacion'}
                  className={
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ' +
                    (t.tiene_observacion
                      ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      : 'bg-marca-600 text-white shadow-2xs hover:bg-marca-700')
                  }
                >
                  <IconoNota className="size-3.5" />
                  <span>{t.tiene_observacion ? 'Ver nota' : 'Cargar nota'}</span>
                </Link>
              )}

              <Link
                href={'/turnos/' + t.id}
                className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <span>Detalle</span>
                <IconoFlechaDerecha className="size-3.5" />
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
