'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { IconoReloj, IconoSede, IconoX } from '@/componentes/Iconos'
import { Encabezado, Vacio } from '@/componentes/ui'
import type { HorarioAtencion, Perfil, Sede } from '@/lib/dominio'
import { DIAS_SEMANA, hhmm } from '@/lib/fechas'
import * as almacen from '@/lib/local/almacen'
import Protegido from '@/lib/local/Protegido'
import type { Sesion } from '@/lib/local/sesion'
import { borrarHorario } from '../acciones'
import FormHorario from './FormHorario'

function Contenido({ sesion }: { sesion: Sesion }) {
  const sp = useSearchParams()
  const [profesionales, setProfesionales] = useState<Perfil[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [horarios, setHorarios] = useState<HorarioAtencion[]>([])

  const profesionalId =
    sesion.esAdmin && sp.get('prof') && profesionales.some((p) => p.id === sp.get('prof'))
      ? sp.get('prof')!
      : sesion.perfil.id

  const recargar = useCallback(() => {
    setProfesionales(almacen.listarProfesionales(sesion.centro.id))
    setSedes(almacen.listarSedes(sesion.centro.id))
  }, [sesion.centro.id])

  useEffect(recargar, [recargar])
  useEffect(() => {
    setHorarios(almacen.horariosDe(profesionalId))
  }, [profesionalId])

  function alBorrar(fd: FormData) {
    borrarHorario(fd)
    setHorarios(almacen.horariosDe(profesionalId))
  }

  const nombreSede = new Map(sedes.map((s) => [s.id, s.nombre]))
  const orden = [1, 2, 3, 4, 5, 6, 0]
  const porDia = new Map(orden.map((d) => [d, horarios.filter((h) => h.dia_semana === d)]))
  const deQuien = profesionales.find((p) => p.id === profesionalId)?.nombre ?? sesion.perfil.nombre

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado
        titulo="Horarios de atención"
        descripcion={
          profesionalId === sesion.perfil.id
            ? 'Los horarios que declarás acá limitan los turnos que se pueden cargar en tu agenda.'
            : 'Estás editando los horarios de ' + deQuien + '.'
        }
        acciones={
          <Link href="/configuracion" className="boton-fantasma boton-chico">
            Volver a configuración
          </Link>
        }
      />

      {sesion.esAdmin && profesionales.length > 1 && (
        <nav className="mb-5 flex flex-wrap gap-2 no-imprimir">
          {profesionales.map((p) => (
            <Link
              key={p.id}
              href={'/configuracion/horarios?prof=' + p.id}
              aria-current={p.id === profesionalId ? 'page' : undefined}
              className={
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ' +
                (p.id === profesionalId
                  ? 'border-marca-600 bg-marca-50 text-marca-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')
              }
            >
              {p.nombre}
            </Link>
          ))}
        </nav>
      )}

      <div className="space-y-5">
        <section className="tarjeta p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Agregar una franja</h2>
          <FormHorario
            sesion={sesion}
            profesionalId={profesionalId}
            sedes={sedes}
            onGuardado={() => setHorarios(almacen.horariosDe(profesionalId))}
          />
        </section>

        <section className="tarjeta overflow-hidden">
          <div className="border-b border-linea px-5 py-4">
            <h2 className="font-semibold text-slate-900">Semana tipo</h2>
          </div>

          {horarios.length === 0 ? (
            <Vacio
              Icono={IconoReloj}
              titulo="Todavía no hay horarios cargados"
              texto="Sin franjas de atención, el sistema avisa cada vez que se intenta cargar un turno fuera de rango."
            />
          ) : (
            <ul className="divide-y divide-linea">
              {orden.map((d) => {
                const franjas = porDia.get(d) ?? []
                return (
                  <li key={d} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                    <span
                      className={
                        'w-24 shrink-0 text-sm font-semibold ' +
                        (franjas.length > 0 ? 'text-slate-800' : 'text-slate-400')
                      }
                    >
                      {DIAS_SEMANA[d]}
                    </span>

                    {franjas.length === 0 ? (
                      <span className="text-sm text-slate-400">No atiende</span>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {franjas.map((f) => (
                          <li key={f.id}>
                            <form action={alBorrar} className="group">
                              <input type="hidden" name="id" value={f.id} />
                              <span className="inline-flex items-center gap-2 rounded-lg bg-marca-50 py-1.5 pr-1.5 pl-3 text-sm font-semibold tabular-nums text-marca-800 ring-1 ring-inset ring-marca-200">
                                {hhmm(f.hora_inicio)}–{hhmm(f.hora_fin)}
                                {f.sede_id && nombreSede.has(f.sede_id) && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-marca-600">
                                    <IconoSede className="size-3.5" />
                                    {nombreSede.get(f.sede_id)}
                                  </span>
                                )}
                                <button
                                  type="submit"
                                  aria-label="Quitar esta franja"
                                  className="grid size-6 place-items-center rounded-md text-marca-500 hover:bg-white hover:text-rose-600"
                                >
                                  <IconoX className="size-4" />
                                </button>
                              </span>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default function PaginaHorarios() {
  return (
    <Suspense fallback={null}>
      <Protegido>{(sesion) => <Contenido sesion={sesion} />}</Protegido>
    </Suspense>
  )
}
