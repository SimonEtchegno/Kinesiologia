import type { Metadata } from 'next'
import Link from 'next/link'
import { IconoDescargar, IconoReportes } from '@/componentes/Iconos'
import { Encabezado, Metrica, Vacio } from '@/componentes/ui'
import { nombreCompleto, tipoSesionDe, type TurnoExpandido } from '@/lib/dominio'
import { turnosEnRango } from '@/lib/datos'
import { aISO, esISO, formatearFechaCorta, hoyISO } from '@/lib/fechas'
import { exigirAdmin } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'

export const metadata: Metadata = {
  title: 'Reportes',
}

/** Barra horizontal de una sola serie: un solo tono, valor siempre visible. */
function Barra({ valor, maximo, titulo }: { valor: number; maximo: number; titulo: string }) {
  const pct = maximo > 0 ? Math.max((valor / maximo) * 100, valor > 0 ? 3 : 0) : 0
  return (
    <div className="flex items-center gap-3" title={titulo}>
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-marca-600" style={{ width: pct + '%' }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
        {valor}
      </span>
    </div>
  )
}

interface Parametros {
  desde?: string
  hasta?: string
}

export default async function PaginaReportes({
  searchParams,
}: {
  searchParams: Promise<Parametros>
}) {
  await exigirAdmin()
  const sp = await searchParams

  const hoy = hoyISO()
  const primeroDelMes = aISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const desde = esISO(sp.desde) ? sp.desde : primeroDelMes
  const hasta = esISO(sp.hasta) ? sp.hasta : hoy

  const supabase = await clienteServidor()
  const turnos: TurnoExpandido[] = await turnosEnRango(supabase, desde, hasta, {
    incluirCancelados: true,
  })

  const realizados = turnos.filter((t) => t.estado === 'realizado')
  const ausentes = turnos.filter((t) => t.estado === 'ausente')
  const cancelados = turnos.filter((t) => t.estado === 'cancelado')
  const pendientes = turnos.filter((t) => t.estado === 'confirmado' || t.estado === 'reprogramado')

  const cerrados = realizados.length + ausentes.length
  const ausentismo = cerrados > 0 ? (ausentes.length / cerrados) * 100 : null

  const porProfesional = new Map<string, { nombre: string; realizadas: number; ausencias: number }>()
  const porPaciente = new Map<string, { nombre: string; realizadas: number; ausencias: number }>()

  for (const t of turnos) {
    if (t.estado !== 'realizado' && t.estado !== 'ausente') continue

    const pro = porProfesional.get(t.profesional_id) ?? {
      nombre: t.profesional?.nombre ?? 'Sin asignar',
      realizadas: 0,
      ausencias: 0,
    }
    const pac = porPaciente.get(t.paciente_id) ?? {
      nombre: nombreCompleto(t.paciente),
      realizadas: 0,
      ausencias: 0,
    }

    if (t.estado === 'realizado') {
      pro.realizadas++
      pac.realizadas++
    } else {
      pro.ausencias++
      pac.ausencias++
    }

    porProfesional.set(t.profesional_id, pro)
    porPaciente.set(t.paciente_id, pac)
  }

  const profesionales = [...porProfesional.entries()].sort((a, b) => b[1].realizadas - a[1].realizadas)
  const pacientes = [...porPaciente.entries()].sort((a, b) => b[1].realizadas - a[1].realizadas).slice(0, 12)

  const porTipo = new Map<string, number>()
  for (const t of turnos) {
    if (t.estado === 'cancelado') continue
    porTipo.set(t.tipo_sesion, (porTipo.get(t.tipo_sesion) ?? 0) + 1)
  }
  const tipos = [...porTipo.entries()].sort((a, b) => b[1] - a[1])
  const maxTipo = Math.max(1, ...tipos.map(([, n]) => n))

  const maxProf = Math.max(1, ...profesionales.map(([, v]) => v.realizadas))
  const maxPac = Math.max(1, ...pacientes.map(([, v]) => v.realizadas))

  return (
    <>
      <Encabezado
        titulo="Reportes"
        descripcion={'Del ' + formatearFechaCorta(desde) + ' al ' + formatearFechaCorta(hasta)}
        acciones={
          <a
            href={'/reportes/csv?desde=' + desde + '&hasta=' + hasta}
            className="boton-secundario boton-chico"
          >
            <IconoDescargar className="size-4" />
            Exportar CSV
          </a>
        }
      />

      <form method="GET" action="/reportes" className="mb-6 flex flex-wrap items-end gap-3 no-imprimir">
        <div>
          <label htmlFor="desde" className="etiqueta">Desde</label>
          <input id="desde" name="desde" type="date" defaultValue={desde} className="campo w-auto" />
        </div>
        <div>
          <label htmlFor="hasta" className="etiqueta">Hasta</label>
          <input id="hasta" name="hasta" type="date" defaultValue={hasta} className="campo w-auto" />
        </div>
        <button type="submit" className="boton-secundario boton-chico">Filtrar</button>
      </form>

      {turnos.length === 0 ? (
        <div className="tarjeta">
          <Vacio Icono={IconoReportes} titulo="Sin turnos en ese período" texto="Elegí otro rango de fechas para ver los números del consultorio." />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metrica etiqueta="Turnos atendidos" valor={realizados.length} detalle={'de ' + turnos.length + ' turnos del período'} tono="bien" />
            <Metrica
              etiqueta="Tasa de ausentismo"
              valor={ausentismo == null ? '—' : ausentismo.toFixed(1) + '%'}
              detalle={ausentismo == null ? 'todavía no hay turnos cerrados' : ausentes.length + ' ausencias sobre ' + cerrados + ' turnos cerrados'}
              tono={ausentismo != null && ausentismo >= 15 ? 'alerta' : 'neutro'}
            />
            <Metrica etiqueta="Cancelados" valor={cancelados.length} detalle="dados de baja antes de la sesión" />
            <Metrica etiqueta="Pendientes" valor={pendientes.length} detalle="todavía sin cerrar" />
          </div>

          <section className="tarjeta overflow-hidden">
            <div className="border-b border-linea px-5 py-4">
              <h2 className="font-semibold text-slate-900">Turnos por tipo de sesión</h2>
              <p className="subtitulo">Con el mismo color que en la agenda. No cuenta los cancelados.</p>
            </div>
            <ul className="divide-y divide-linea">
              {tipos.map(([valor, cantidad]) => {
                const tipo = tipoSesionDe(valor)
                const pct = Math.max((cantidad / maxTipo) * 100, 3)
                return (
                  <li key={valor} className="flex items-center gap-3 px-5 py-3">
                    <span className={'size-2.5 shrink-0 rounded-full ' + tipo.punto} />
                    <span className="w-52 shrink-0 truncate text-sm font-medium text-slate-800">
                      {tipo.etiqueta}
                    </span>
                    <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className={'block h-full rounded-full ' + tipo.punto}
                        style={{ width: pct + '%' }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
                      {cantidad}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="tarjeta overflow-hidden">
            <div className="border-b border-linea px-5 py-4">
              <h2 className="font-semibold text-slate-900">Sesiones por profesional</h2>
              <p className="subtitulo">Turnos realizados en el período</p>
            </div>
            <div className="overflow-x-auto scroll-fino">
              <table className="tabla min-w-[34rem]">
                <thead>
                  <tr>
                    <th className="w-56">Profesional</th>
                    <th>Realizadas</th>
                    <th className="w-28 text-right">Ausencias</th>
                    <th className="w-32 text-right">Ausentismo</th>
                  </tr>
                </thead>
                <tbody>
                  {profesionales.map(([id, v]) => {
                    const total = v.realizadas + v.ausencias
                    return (
                      <tr key={id}>
                        <td className="font-medium text-slate-800">{v.nombre}</td>
                        <td><Barra valor={v.realizadas} maximo={maxProf} titulo={v.nombre + ': ' + v.realizadas + ' sesiones realizadas'} /></td>
                        <td className="text-right tabular-nums text-slate-600">{v.ausencias}</td>
                        <td className="text-right tabular-nums text-slate-600">
                          {total > 0 ? ((v.ausencias / total) * 100).toFixed(0) + '%' : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="tarjeta overflow-hidden">
            <div className="border-b border-linea px-5 py-4">
              <h2 className="font-semibold text-slate-900">Sesiones por paciente</h2>
              <p className="subtitulo">Los 12 con más sesiones en el período</p>
            </div>
            <div className="overflow-x-auto scroll-fino">
              <table className="tabla min-w-[34rem]">
                <thead>
                  <tr>
                    <th className="w-56">Paciente</th>
                    <th>Realizadas</th>
                    <th className="w-28 text-right">Ausencias</th>
                    <th className="w-24 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {pacientes.map(([id, v]) => (
                    <tr key={id}>
                      <td className="font-medium text-slate-800">{v.nombre}</td>
                      <td><Barra valor={v.realizadas} maximo={maxPac} titulo={v.nombre + ': ' + v.realizadas + ' sesiones realizadas'} /></td>
                      <td className="text-right tabular-nums text-slate-600">{v.ausencias}</td>
                      <td className="text-right">
                        <Link href={'/pacientes/' + id} className="boton-fantasma boton-chico">Ficha</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
