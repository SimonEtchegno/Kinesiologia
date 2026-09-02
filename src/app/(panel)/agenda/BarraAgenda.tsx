'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  IconoAgenda,
  IconoDerecha,
  IconoIzquierda,
  IconoMas,
  IconoPacientes,
  IconoSede,
} from '@/componentes/Iconos'
import type { Perfil, Sede } from '@/lib/dominio'
import { formatearFechaLarga, formatearRangoSemana, hoyISO, sumarDias } from '@/lib/fechas'

export type Vista = 'dia' | 'semana'

interface Props {
  fecha: string
  vista: Vista
  prof: string
  sede: string
  profesionales: Perfil[]
  sedes: Sede[]
  esAdmin: boolean
  puedeCargarTurnos: boolean
}

export default function BarraAgenda({
  fecha,
  vista,
  prof,
  sede,
  profesionales,
  sedes,
  esAdmin,
  puedeCargarTurnos,
}: Props) {
  const router = useRouter()
  const params = useSearchParams()

  function href(cambios: Record<string, string>) {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    return '/agenda?' + p.toString()
  }

  const paso = vista === 'dia' ? 1 : 7
  const hoy = hoyISO()
  const esFechaHoy = fecha === hoy

  return (
    <div className="tarjeta-sombra mb-6 p-3.5 sm:p-4.5 no-imprimir">
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
        {/* Navegación temporal y fecha */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Controles anterior / hoy / siguiente */}
          <div className="inline-flex items-center rounded-xl border border-linea bg-slate-50/80 p-0.5 shadow-2xs dark:bg-slate-800/80">
            <Link
              href={href({ fecha: sumarDias(fecha, -paso) })}
              className="grid size-8.5 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-2xs dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label={vista === 'dia' ? 'Día anterior' : 'Semana anterior'}
            >
              <IconoIzquierda className="size-4" />
            </Link>
            <Link
              href={href({ fecha: hoy })}
              className={
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ' +
                (esFechaHoy
                  ? 'bg-marca-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-2xs dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white')
              }
            >
              Hoy
            </Link>
            <Link
              href={href({ fecha: sumarDias(fecha, paso) })}
              className="grid size-8.5 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-2xs dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label={vista === 'dia' ? 'Día siguiente' : 'Semana siguiente'}
            >
              <IconoDerecha className="size-4" />
            </Link>
          </div>

          {/* Título de la fecha seleccionada */}
          <div className="flex items-center gap-2">
            <span className="grid size-8.5 place-items-center rounded-lg bg-marca-50 text-marca-600 dark:bg-marca-950/60 dark:text-marca-400">
              <IconoAgenda className="size-4.5" />
            </span>
            <div>
              <p className="text-sm sm:text-base font-bold tracking-tight text-slate-900 capitalize dark:text-white">
                {vista === 'dia' ? formatearFechaLarga(fecha) : formatearRangoSemana(fecha)}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones principales: Switch Día/Semana y botón Nuevo Turno */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Switch Día / Semana */}
          <div className="inline-flex items-center rounded-xl border border-linea bg-slate-100/90 p-1 dark:bg-slate-800/90">
            {(['dia', 'semana'] as const).map((v) => {
              const activo = vista === v
              return (
                <Link
                  key={v}
                  href={href({ vista: v })}
                  aria-current={activo ? 'true' : undefined}
                  className={
                    'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ' +
                    (activo
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200')
                  }
                >
                  {v === 'dia' ? 'Día' : 'Semana'}
                </Link>
              )
            })}
          </div>

          {/* Botón Nuevo Turno */}
          {puedeCargarTurnos && (
            <Link
              href={
                '/turnos/nuevo?fecha=' +
                fecha +
                (prof && prof !== 'todos' ? '&prof=' + prof : '')
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-marca-600 to-marca-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs shadow-marca-500/25 transition-all hover:from-marca-500 hover:to-marca-600 hover:shadow-md hover:shadow-marca-500/30 active:scale-98"
            >
              <IconoMas className="size-4" />
              <span>Nuevo turno</span>
            </Link>
          )}
        </div>
      </div>

      {/* Barra de Filtros secundarios: Profesional y Sede */}
      {(esAdmin || sedes.length > 1) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-linea/80 pt-3">
          {esAdmin && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <IconoPacientes className="size-3.5 text-slate-400" />
                Profesional:
              </span>
              <select
                value={prof}
                onChange={(e) => router.push(href({ prof: e.target.value }))}
                className="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 shadow-2xs focus:border-marca-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="todos">Todos los profesionales</option>
                {profesionales.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {sedes.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <IconoSede className="size-3.5 text-slate-400" />
                Sede:
              </span>
              <select
                value={sede}
                onChange={(e) => router.push(href({ sede: e.target.value }))}
                className="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 shadow-2xs focus:border-marca-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">Todas las sedes</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
