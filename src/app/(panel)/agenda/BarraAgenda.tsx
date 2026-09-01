'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconoIzquierda, IconoDerecha, IconoMas } from '@/componentes/Iconos'
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

  return (
    <div className="mb-5 space-y-3 no-imprimir">
      <div className="flex flex-wrap items-center gap-2">
        {/* Navegación temporal */}
        <div className="flex items-center rounded-lg border border-slate-300 bg-white">
          <Link
            href={href({ fecha: sumarDias(fecha, -paso) })}
            className="grid size-9 place-items-center rounded-l-lg text-slate-500 hover:bg-slate-50"
            aria-label={vista === 'dia' ? 'Día anterior' : 'Semana anterior'}
          >
            <IconoIzquierda className="size-[1.1rem]" />
          </Link>
          <Link
            href={href({ fecha: hoy })}
            className="border-x border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Hoy
          </Link>
          <Link
            href={href({ fecha: sumarDias(fecha, paso) })}
            className="grid size-9 place-items-center rounded-r-lg text-slate-500 hover:bg-slate-50"
            aria-label={vista === 'dia' ? 'Día siguiente' : 'Semana siguiente'}
          >
            <IconoDerecha className="size-[1.1rem]" />
          </Link>
        </div>

        <p className="px-1 text-sm font-semibold text-slate-800 first-letter:uppercase">
          {vista === 'dia' ? formatearFechaLarga(fecha) : formatearRangoSemana(fecha)}
        </p>

        {/* Día / Semana */}
        <div className="ml-auto flex items-center rounded-lg border border-slate-300 bg-white p-0.5">
          {(['dia', 'semana'] as const).map((v) => (
            <Link
              key={v}
              href={href({ vista: v })}
              aria-current={vista === v ? 'true' : undefined}
              className={
                'rounded-[0.4rem] px-3 py-1.5 text-sm font-medium transition-colors ' +
                (vista === v ? 'bg-marca-600 text-white' : 'text-slate-600 hover:bg-slate-50')
              }
            >
              {v === 'dia' ? 'Día' : 'Semana'}
            </Link>
          ))}
        </div>

        {puedeCargarTurnos && (
          <Link
            href={
              '/turnos/nuevo?fecha=' +
              fecha +
              (prof && prof !== 'todos' ? '&prof=' + prof : '')
            }
            className="boton-primario boton-chico"
          >
            <IconoMas className="size-[1.05rem]" />
            Nuevo turno
          </Link>
        )}
      </div>

      {/* Filtros: solo el admin ve más de una agenda (UC-11) */}
      {(esAdmin || sedes.length > 1) && (
        <div className="flex flex-wrap items-center gap-3">
          {esAdmin && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Profesional
              <select
                value={prof}
                onChange={(e) => router.push(href({ prof: e.target.value }))}
                className="campo w-auto py-1.5 text-sm"
              >
                <option value="todos">Todos</option>
                {profesionales.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          {sedes.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Sede
              <select
                value={sede}
                onChange={(e) => router.push(href({ sede: e.target.value }))}
                className="campo w-auto py-1.5 text-sm"
              >
                <option value="">Todas</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  )
}
