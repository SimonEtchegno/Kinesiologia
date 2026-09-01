'use client'

import Link from 'next/link'
import { IconoAgenda, IconoCheck, IconoNota, IconoSede, IconoX } from '@/componentes/Iconos'
import { ChipEstado, Vacio } from '@/componentes/ui'
import { COBERTURAS, nombreCompleto, type TurnoExpandido } from '@/lib/dominio'
import { hhmm, yaPaso } from '@/lib/fechas'
import type { Sesion } from '@/lib/local/sesion'
import { marcarTurno } from '../turnos/acciones'

interface Props {
  turnos: TurnoExpandido[]
  mostrarProfesional: boolean
  sesion: Sesion
  fecha: string
  onCambio: () => void
}

export default function VistaDia({ turnos, mostrarProfesional, sesion, fecha, onCambio }: Props) {
  const usuarioId = sesion.perfil.id
  const esAdmin = sesion.esAdmin
  const puedeCargarTurnos = sesion.puedeCargarTurnos

  function marcar(fd: FormData) {
    marcarTurno(sesion, fd)
    onCambio()
  }

  if (turnos.length === 0) {
    return (
      <div className="tarjeta">
        <Vacio
          Icono={IconoAgenda}
          titulo="No hay turnos este día"
          texto="Cuando cargues turnos para esta fecha van a aparecer acá, ordenados por horario."
          accion={
            puedeCargarTurnos ? (
              <Link href={'/turnos/nuevo?fecha=' + fecha} className="boton-primario boton-chico">
                Cargar un turno
              </Link>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <ul className="space-y-2.5">
      {turnos.map((t) => {
        const propio = t.profesional_id === usuarioId
        const puedeMarcar =
          (propio || esAdmin) &&
          t.estado !== 'cancelado' &&
          yaPaso(t.fecha, hhmm(t.hora_inicio))

        return (
          <li key={t.id} className="tarjeta flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
            {/* Horario */}
            <div className="w-[4.5rem] shrink-0">
              <p className="text-base font-semibold tabular-nums text-slate-900">
                {hhmm(t.hora_inicio)}
              </p>
              <p className="text-xs tabular-nums text-slate-400">{hhmm(t.hora_fin)}</p>
            </div>

            {/* Paciente y sesión */}
            <div className="min-w-[12rem] flex-1">
              <Link
                href={'/pacientes/' + t.paciente_id}
                className="font-semibold text-slate-900 hover:text-marca-700 hover:underline"
              >
                {nombreCompleto(t.paciente)}
              </Link>
              <p className="text-sm text-slate-500">
                {t.tipo_sesion}
                {t.paciente && (
                  <>
                    {' · '}
                    {t.paciente.cobertura === 'obra_social'
                      ? (t.paciente.obra_social ?? COBERTURAS.obra_social)
                      : COBERTURAS.particular}
                  </>
                )}
              </p>
              {(mostrarProfesional || t.sede) && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                  {mostrarProfesional && t.profesional && <span>{t.profesional.nombre}</span>}
                  {t.sede && (
                    <span className="inline-flex items-center gap-1">
                      <IconoSede className="size-3.5" />
                      {t.sede.nombre}
                    </span>
                  )}
                </p>
              )}
            </div>

            <ChipEstado estado={t.estado} />

            {/* Acciones rápidas (UC-05, UC-06) */}
            <div className="ml-auto flex flex-wrap items-center gap-2 no-imprimir">
              {puedeMarcar && t.estado !== 'realizado' && (
                <form action={marcar}>
                  <input type="hidden" name="turno_id" value={t.id} />
                  <input type="hidden" name="estado" value="realizado" />
                  <button type="submit" className="boton-acento boton-chico">
                    <IconoCheck className="size-4" />
                    Realizado
                  </button>
                </form>
              )}

              {puedeMarcar && t.estado !== 'ausente' && (
                <form action={marcar}>
                  <input type="hidden" name="turno_id" value={t.id} />
                  <input type="hidden" name="estado" value="ausente" />
                  <button type="submit" className="boton-secundario boton-chico">
                    <IconoX className="size-4" />
                    Ausente
                  </button>
                </form>
              )}

              {t.estado === 'realizado' && propio && (
                <Link
                  href={'/turnos/' + t.id + '#observacion'}
                  className={
                    (t.tiene_observacion ? 'boton-secundario' : 'boton-primario') + ' boton-chico'
                  }
                >
                  <IconoNota className="size-4" />
                  {t.tiene_observacion ? 'Ver nota' : 'Cargar nota'}
                </Link>
              )}

              <Link href={'/turnos/' + t.id} className="boton-fantasma boton-chico">
                Detalle
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
