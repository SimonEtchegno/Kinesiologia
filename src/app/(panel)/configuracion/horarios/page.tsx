import Link from 'next/link'
import BotonEnviar from '@/componentes/BotonEnviar'
import { IconoReloj, IconoSede, IconoX } from '@/componentes/Iconos'
import { Encabezado, Vacio } from '@/componentes/ui'
import { DIAS_SEMANA, hhmm } from '@/lib/fechas'
import { horariosDe, listarProfesionales, listarSedes } from '@/lib/datos'
import { exigirSesion } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'
import { borrarHorario } from '../acciones'
import FormHorario from './FormHorario'

export default async function PaginaHorarios({
  searchParams,
}: {
  searchParams: Promise<{ prof?: string }>
}) {
  const sesion = await exigirSesion()
  const sp = await searchParams
  const supabase = await clienteServidor()

  const [profesionales, sedes] = await Promise.all([
    listarProfesionales(supabase),
    listarSedes(supabase),
  ])

  const profesionalId =
    sesion.esAdmin && sp.prof && profesionales.some((p) => p.id === sp.prof)
      ? sp.prof
      : sesion.perfil.id

  const horarios = await horariosDe(supabase, profesionalId)

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
          <FormHorario profesionalId={profesionalId} sedes={sedes} />
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
                            <form action={borrarHorario} className="group">
                              <input type="hidden" name="id" value={f.id} />
                              <span className="inline-flex items-center gap-2 rounded-lg bg-marca-50 py-1.5 pr-1.5 pl-3 text-sm font-semibold tabular-nums text-marca-800 ring-1 ring-inset ring-marca-200">
                                {hhmm(f.hora_inicio)}–{hhmm(f.hora_fin)}
                                {f.sede_id && nombreSede.has(f.sede_id) && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-marca-600">
                                    <IconoSede className="size-3.5" />
                                    {nombreSede.get(f.sede_id)}
                                  </span>
                                )}
                                <BotonEnviar
                                  aria-label="Quitar esta franja"
                                  className="grid size-6 place-items-center rounded-md text-marca-500 hover:bg-white hover:text-rose-600 disabled:opacity-60"
                                >
                                  <IconoX className="size-4" />
                                </BotonEnviar>
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
