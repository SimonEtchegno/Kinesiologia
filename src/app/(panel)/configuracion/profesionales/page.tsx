import Link from 'next/link'
import { IconoMas, IconoReloj } from '@/componentes/Iconos'
import { Encabezado } from '@/componentes/ui'
import { iniciales } from '@/lib/dominio'
import { listarProfesionales } from '@/lib/datos'
import { exigirAdmin } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'
import { cambiarActivoProfesional } from '../acciones'
import SelectorRol from './SelectorRol'

export default async function PaginaProfesionales() {
  const sesion = await exigirAdmin()
  const supabase = await clienteServidor()
  const profesionales = await listarProfesionales(supabase, false)

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
              <SelectorRol perfilId={p.id} nombre={p.nombre} rolActual={p.rol} />
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
                <form action={cambiarActivoProfesional}>
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
