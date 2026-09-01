'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { IconoSede } from '@/componentes/Iconos'
import { Encabezado, Vacio } from '@/componentes/ui'
import type { Sede } from '@/lib/dominio'
import * as almacen from '@/lib/local/almacen'
import Protegido from '@/lib/local/Protegido'
import type { Sesion } from '@/lib/local/sesion'
import { cambiarActivaSede } from '../acciones'
import FormSede from './FormSede'

function Contenido({ sesion }: { sesion: Sesion }) {
  const [sedes, setSedes] = useState<Sede[]>([])

  const recargar = useCallback(() => {
    setSedes(almacen.listarSedes(sesion.centro.id, false))
  }, [sesion.centro.id])

  useEffect(recargar, [recargar])

  function alCambiarActiva(fd: FormData) {
    cambiarActivaSede(fd)
    recargar()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado
        titulo="Sedes"
        descripcion="Las sedes activas aparecen para elegir al cargar un turno o un horario de atención."
        acciones={
          <Link href="/configuracion" className="boton-fantasma boton-chico">
            Volver a configuración
          </Link>
        }
      />

      <div className="space-y-5">
        <section className="tarjeta p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Agregar una sede</h2>
          <FormSede sesion={sesion} onCreada={recargar} />
        </section>

        <section className="tarjeta overflow-hidden">
          {sedes.length === 0 ? (
            <Vacio
              Icono={IconoSede}
              titulo="Todavía no hay sedes"
              texto="Si el centro atiende en un solo lugar, no hace falta cargar ninguna."
            />
          ) : (
            <ul className="divide-y divide-linea">
              {sedes.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                  <span
                    className={
                      'grid size-9 shrink-0 place-items-center rounded-full ' +
                      (s.activa ? 'bg-marca-50 text-marca-600' : 'bg-slate-100 text-slate-400')
                    }
                  >
                    <IconoSede className="size-[1.05rem]" />
                  </span>
                  <div className="min-w-[10rem] flex-1">
                    <p className={'font-medium ' + (s.activa ? 'text-slate-900' : 'text-slate-400')}>
                      {s.nombre}
                      {!s.activa && (
                        <span className="chip ml-2 bg-slate-100 text-slate-500 ring-slate-200">
                          Inactiva
                        </span>
                      )}
                    </p>
                    {s.direccion && <p className="text-sm text-slate-500">{s.direccion}</p>}
                  </div>

                  <form action={alCambiarActiva} className="no-imprimir">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="activa" value={s.activa ? 'no' : 'si'} />
                    <button
                      type="submit"
                      className={(s.activa ? 'boton-peligro' : 'boton-secundario') + ' boton-chico'}
                    >
                      {s.activa ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default function PaginaSedes() {
  return (
    <Protegido soloAdmin>
      {(sesion) => <Contenido sesion={sesion} />}
    </Protegido>
  )
}
