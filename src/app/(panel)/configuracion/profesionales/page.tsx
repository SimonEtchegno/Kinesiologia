'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { IconoMas, IconoReloj } from '@/componentes/Iconos'
import { Encabezado } from '@/componentes/ui'
import { iniciales, type Perfil } from '@/lib/dominio'
import * as almacen from '@/lib/local/almacen'
import Protegido from '@/lib/local/Protegido'
import type { Sesion } from '@/lib/local/sesion'
import { cambiarActivoProfesional, cambiarRolProfesional } from '../acciones'

function Contenido({ sesion }: { sesion: Sesion }) {
  const [profesionales, setProfesionales] = useState<Perfil[]>([])

  const recargar = useCallback(() => {
    setProfesionales(almacen.listarProfesionales(sesion.centro.id, false))
  }, [sesion.centro.id])

  useEffect(recargar, [recargar])

  function alCambiarActivo(fd: FormData) {
    cambiarActivoProfesional(sesion, fd)
    recargar()
  }

  function alCambiarRol(fd: FormData) {
    cambiarRolProfesional(sesion, fd)
    recargar()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado
        titulo="Profesionales"
        descripcion={sesion.centro.nombre}
        acciones={
          <>
            <Link
              href="/configuracion/profesionales/nuevo"
              className="boton-primario boton-chico"
            >
              <IconoMas className="size-[1.05rem]" />
              Nuevo profesional
            </Link>
            <Link href="/configuracion" className="boton-fantasma boton-chico">
              Volver
            </Link>
          </>
        }
      />

      <ul className="space-y-2.5">
        {profesionales.map((p) => (
          <li key={p.id} className="tarjeta flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
            <span
              className={
                'grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ' +
                (p.activo ? 'bg-marca-50 text-marca-700' : 'bg-slate-100 text-slate-400')
              }
            >
              {iniciales(p.nombre)}
            </span>

            <div className="min-w-[10rem] flex-1">
              <p className="font-semibold text-slate-900">
                {p.nombre}
                {p.id === sesion.perfil.id && (
                  <span className="chip ml-2 bg-marca-50 text-marca-700 ring-marca-200">Vos</span>
                )}
                {!p.activo && (
                  <span className="chip ml-2 bg-slate-100 text-slate-500 ring-slate-200">
                    Dado de baja
                  </span>
                )}
              </p>
              <p className="text-sm text-slate-500">
                {p.especialidad ?? (p.rol === 'admin' ? 'Administrador' : 'Kinesiólogo/a')}
                {' · '}
                {p.email}
              </p>
            </div>

            {p.id === sesion.perfil.id ? (
              <span className="chip bg-slate-100 text-slate-600 ring-slate-200">
                {p.rol === 'admin' ? 'Administrador' : 'Kinesiólogo/a'}
              </span>
            ) : (
              <form action={alCambiarRol}>
                <input type="hidden" name="id" value={p.id} />
                <label className="sr-only" htmlFor={'rol-' + p.id}>
                  Rol de {p.nombre}
                </label>
                <select
                  id={'rol-' + p.id}
                  name="rol"
                  defaultValue={p.rol}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className="campo w-auto py-1.5 text-sm"
                >
                  <option value="kinesiologo">Kinesiólogo/a</option>
                  <option value="admin">Administrador</option>
                </select>
              </form>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2 no-imprimir">
              <Link
                href={'/configuracion/horarios?prof=' + p.id}
                className="boton-secundario boton-chico"
              >
                <IconoReloj className="size-4" />
                Horarios
              </Link>
              <Link href={'/agenda?prof=' + p.id} className="boton-fantasma boton-chico">
                Ver agenda
              </Link>

              {p.id !== sesion.perfil.id && (
                <form action={alCambiarActivo}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="activo" value={p.activo ? 'no' : 'si'} />
                  <button
                    type="submit"
                    className={(p.activo ? 'boton-peligro' : 'boton-secundario') + ' boton-chico'}
                  >
                    {p.activo ? 'Dar de baja' : 'Reactivar'}
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm text-slate-500">
        Dar de baja a un profesional le saca el acceso, pero conserva sus turnos y observaciones en
        el historial de cada paciente.
      </p>
    </div>
  )
}

export default function PaginaProfesionales() {
  return (
    <Protegido soloAdmin>
      {(sesion) => <Contenido sesion={sesion} />}
    </Protegido>
  )
}
