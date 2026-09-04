import type { Metadata } from 'next'
import Link from 'next/link'
import BotonEnviar from '@/componentes/BotonEnviar'
import { IconoBuscar, IconoCheck, IconoMas, IconoPacientes, IconoX } from '@/componentes/Iconos'
import { Encabezado, Vacio } from '@/componentes/ui'
import { COBERTURAS, iniciales } from '@/lib/dominio'
import { buscarPacientes } from '@/lib/datos'
import { edad } from '@/lib/fechas'
import { exigirSesion } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'
import { cambiarActivoPaciente } from './acciones'

export const metadata: Metadata = {
  title: 'Pacientes',
}

/**
 * Dar de baja o reactivar, sin entrar a la ficha. No borra nada: conserva
 * el historial. En la tabla de escritorio va solo con ícono — con texto,
 * "Dar de baja" no entraba en la columna y el botón terminaba partido en
 * tres líneas; en la tarjeta de mobile hay lugar de sobra, así que ahí
 * lleva la etiqueta al lado (más claro al tacto).
 */
function BotonBaja({
  id,
  activo,
  conTexto = false,
}: {
  id: string
  activo: boolean
  conTexto?: boolean
}) {
  const etiqueta = activo ? 'Dar de baja' : 'Reactivar'
  return (
    <form action={cambiarActivoPaciente} className="no-imprimir">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activo" value={activo ? 'no' : 'si'} />
      <BotonEnviar
        aria-label={etiqueta + ' al paciente'}
        title={conTexto ? undefined : etiqueta}
        cargando={conTexto ? (activo ? 'Dando de baja…' : 'Reactivando…') : undefined}
        className={
          (conTexto
            ? 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap '
            : 'grid size-8 shrink-0 place-items-center rounded-lg border ') +
          'transition-colors disabled:opacity-60 ' +
          (activo
            ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40'
            : 'border-linea text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800')
        }
      >
        {activo ? <IconoX className="size-4" /> : <IconoCheck className="size-4" />}
        {conTexto && etiqueta}
      </BotonEnviar>
    </form>
  )
}

export default async function PaginaPacientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; inactivos?: string }>
}) {
  await exigirSesion()
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const verInactivos = sp.inactivos === 'si'

  const supabase = await clienteServidor()
  const pacientes = await buscarPacientes(supabase, q, { incluirInactivos: verInactivos })

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

      <form method="GET" action="/pacientes" className="mb-5 flex flex-col gap-3 no-imprimir sm:flex-row sm:items-center">
        {verInactivos && <input type="hidden" name="inactivos" value="si" />}
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
                  <div className="flex justify-end border-t border-linea px-4 py-2.5">
                    <BotonBaja id={p.id} activo={p.activo} conTexto />
                  </div>
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
                    <th className="w-1" />
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
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <Link href={'/pacientes/' + p.id} className="boton-fantasma boton-chico">
                              Ver ficha
                            </Link>
                            <BotonBaja id={p.id} activo={p.activo} />
                          </div>
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
