'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { IconoBuscar, IconoMas, IconoPacientes } from '@/componentes/Iconos'
import { Encabezado, Vacio } from '@/componentes/ui'
import { COBERTURAS, iniciales, type Paciente } from '@/lib/dominio'
import { edad } from '@/lib/fechas'
import * as almacen from '@/lib/local/almacen'
import Protegido from '@/lib/local/Protegido'
import type { Sesion } from '@/lib/local/sesion'

function Contenido({ sesion }: { sesion: Sesion }) {
  const router = useRouter()
  const sp = useSearchParams()
  const q = sp.get('q') ?? ''
  const verInactivos = sp.get('inactivos') === 'si'

  const [pacientes, setPacientes] = useState<Paciente[]>([])

  useEffect(() => {
    setPacientes(almacen.buscarPacientes(sesion.centro.id, q, { incluirInactivos: verInactivos }))
  }, [sesion.centro.id, q, verInactivos])

  function buscar(fd: FormData) {
    const texto = String(fd.get('q') ?? '')
    const p = new URLSearchParams()
    if (texto) p.set('q', texto)
    if (verInactivos) p.set('inactivos', 'si')
    router.push('/pacientes?' + p.toString())
  }

  return (
    <>
      <Encabezado
        titulo="Pacientes"
        descripcion={
          pacientes.length === 1 ? '1 paciente' : pacientes.length + ' pacientes en la lista'
        }
        acciones={
          <Link href="/pacientes/nuevo" className="boton-primario boton-chico">
            <IconoMas className="size-[1.05rem]" />
            Nuevo paciente
          </Link>
        }
      />

      <form action={buscar} className="mb-5 flex flex-col gap-3 no-imprimir sm:flex-row sm:items-center">
        <div className="relative min-w-0 sm:max-w-md sm:flex-1">
          <IconoBuscar className="pointer-events-none absolute top-1/2 left-3 size-[1.1rem] -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por apellido, nombre o DNI…"
            className="campo pl-10"
            aria-label="Buscar paciente"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="boton-secundario boton-chico">
            Buscar
          </button>
          <Link
            href={
              verInactivos
                ? '/pacientes' + (q ? '?q=' + encodeURIComponent(q) : '')
                : '/pacientes?inactivos=si' + (q ? '&q=' + encodeURIComponent(q) : '')
            }
            className="boton-fantasma boton-chico"
          >
            {verInactivos ? 'Ver solo activos' : 'Incluir dados de baja'}
          </Link>
        </div>
      </form>

      {pacientes.length === 0 ? (
        <div className="tarjeta overflow-hidden">
          <Vacio
            Icono={IconoPacientes}
            titulo={q ? 'Sin resultados' : 'Todavía no hay pacientes'}
            texto={
              q
                ? 'No encontramos a nadie con "' + q + '". Probá con otro dato.'
                : 'Cargá el primer paciente para poder asignarle turnos.'
            }
            accion={
              <Link href="/pacientes/nuevo" className="boton-primario boton-chico">
                Cargar un paciente
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile: tarjetas. Desde sm: tabla. */}
          <ul className="space-y-2.5 sm:hidden">
            {pacientes.map((p) => {
              const anios = edad(p.fecha_nacimiento)
              return (
                <li key={p.id} className="tarjeta">
                  <Link href={'/pacientes/' + p.id} className="flex items-center gap-3 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-xs font-semibold text-marca-700">
                      {iniciales(p.apellido + ' ' + p.nombre)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className="truncate font-medium text-slate-900">
                          {p.apellido}, {p.nombre}
                        </span>
                        {!p.activo && (
                          <span className="chip bg-slate-100 text-slate-500 ring-slate-200">
                            Dado de baja
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {p.dni ? 'DNI ' + p.dni : 'Sin DNI'}
                        {anios != null ? ' · ' + anios + ' años' : ''}
                      </span>
                      <span className="mt-1 block truncate text-sm text-slate-600">
                        {p.cobertura === 'obra_social'
                          ? (p.obra_social ?? COBERTURAS.obra_social)
                          : COBERTURAS.particular}
                        {(p.telefono ?? p.email) ? ' · ' + (p.telefono ?? p.email) : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="tarjeta hidden overflow-hidden sm:block">
            <div className="overflow-x-auto scroll-fino">
              <table className="tabla min-w-[38rem]">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Cobertura</th>
                    <th>Contacto</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody>
                  {pacientes.map((p) => {
                    const anios = edad(p.fecha_nacimiento)
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td>
                          <Link href={'/pacientes/' + p.id} className="flex items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-marca-50 text-xs font-semibold text-marca-700">
                              {iniciales(p.apellido + ' ' + p.nombre)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-900">
                                {p.apellido}, {p.nombre}
                                {!p.activo && (
                                  <span className="ml-2 chip bg-slate-100 text-slate-500 ring-slate-200">
                                    Dado de baja
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {p.dni ? 'DNI ' + p.dni : 'Sin DNI'}
                                {anios != null ? ' · ' + anios + ' años' : ''}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="text-slate-600">
                          {p.cobertura === 'obra_social'
                            ? (p.obra_social ?? COBERTURAS.obra_social)
                            : COBERTURAS.particular}
                        </td>
                        <td className="text-slate-600">
                          {p.telefono ?? p.email ?? <span className="text-slate-400">—</span>}
                        </td>
                        <td className="text-right">
                          <Link href={'/pacientes/' + p.id} className="boton-fantasma boton-chico">
                            Ver ficha
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default function PaginaPacientes() {
  return (
    <Suspense fallback={null}>
      <Protegido>{(sesion) => <Contenido sesion={sesion} />}</Protegido>
    </Suspense>
  )
}
