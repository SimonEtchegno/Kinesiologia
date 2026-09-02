'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Encabezado } from '@/componentes/ui'
import { ventanaHoraria } from '@/lib/agenda'
import type { HorarioAtencion, Perfil, Sede, TurnoExpandido } from '@/lib/dominio'
import { esISO, hoyISO, semanaDe } from '@/lib/fechas'
import * as almacen from '@/lib/local/almacen'
import Protegido from '@/lib/local/Protegido'
import type { Sesion } from '@/lib/local/sesion'
import BarraAgenda, { type Vista } from './BarraAgenda'
import GrillaSemana from './GrillaSemana'
import LeyendaTipos from './LeyendaTipos'
import VistaDia from './VistaDia'

function Contenido({ sesion }: { sesion: Sesion }) {
  const sp = useSearchParams()
  const hoy = hoyISO()
  const fecha = esISO(sp.get('fecha')) ? sp.get('fecha')! : hoy
  const vista: Vista = sp.get('vista') === 'semana' ? 'semana' : 'dia'
  const prof = sesion.esAdmin ? (sp.get('prof') ?? 'todos') : sesion.perfil.id
  const sede = sp.get('sede') ?? ''
  const profesionalId = prof === 'todos' ? undefined : prof

  const [profesionales, setProfesionales] = useState<Perfil[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [turnos, setTurnos] = useState<TurnoExpandido[]>([])
  const [horarios, setHorarios] = useState<HorarioAtencion[]>([])

  const dias = vista === 'semana' ? semanaDe(fecha) : [fecha]
  const primerDia = dias[0]!
  const ultimoDia = dias[dias.length - 1]!

  function cargar() {
    setProfesionales(almacen.listarProfesionales(sesion.centro.id))
    setSedes(almacen.listarSedes(sesion.centro.id))
    setTurnos(
      almacen.turnosEnRango(sesion.centro.id, primerDia, ultimoDia, {
        profesionalId,
        sedeId: sede || undefined,
      }),
    )
    setHorarios(almacen.horariosDelCentro(sesion.centro.id))
  }

  useEffect(cargar, [sesion.centro.id, primerDia, ultimoDia, profesionalId, sede])

  const turnosPorDia = new Map<string, TurnoExpandido[]>()
  for (const d of dias) turnosPorDia.set(d, [])
  for (const t of turnos) turnosPorDia.get(t.fecha)?.push(t)

  const horariosVisibles = profesionalId ? horarios.filter((h) => h.profesional_id === profesionalId) : horarios
  const ventana = ventanaHoraria(horariosVisibles, turnos)

  const mostrarProfesional = !profesionalId && profesionales.length > 1
  const nombreProf =
    profesionalId && profesionalId !== sesion.perfil.id
      ? profesionales.find((p) => p.id === profesionalId)?.nombre
      : undefined

  const contar = (estado: string) => turnos.filter((t) => t.estado === estado).length

  return (
    <>
      <Encabezado
        titulo={prof === 'todos' ? 'Agenda del centro' : 'Agenda'}
        descripcion={
          nombreProf
            ? 'Turnos de ' + nombreProf
            : prof === 'todos'
              ? 'Todos los profesionales del centro'
              : 'Tus turnos'
        }
      />

      <BarraAgenda
        fecha={fecha}
        vista={vista}
        prof={prof}
        sede={sede}
        profesionales={profesionales}
        sedes={sedes}
        esAdmin={sesion.esAdmin}
        puedeCargarTurnos={sesion.puedeCargarTurnos}
      />

      {turnos.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="inline-flex items-center gap-2 rounded-xl border border-linea bg-white px-3 py-1.5 shadow-2xs dark:bg-slate-850 dark:border-slate-800">
            <span className="size-2 rounded-full bg-slate-400" />
            <span className="text-slate-500 dark:text-slate-400">Total:</span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums">{turnos.length}</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-1.5 text-emerald-800 shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Realizados:</span>
            <span className="font-bold tabular-nums">{contar('realizado')}</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-marca-200/80 bg-marca-50/70 px-3 py-1.5 text-marca-800 shadow-2xs dark:border-marca-800/60 dark:bg-marca-950/40 dark:text-marca-300">
            <span className="size-2 rounded-full bg-marca-500" />
            <span>Pendientes:</span>
            <span className="font-bold tabular-nums">{contar('confirmado') + contar('reprogramado')}</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/70 px-3 py-1.5 text-rose-800 shadow-2xs dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
            <span className="size-2 rounded-full bg-rose-500" />
            <span>Ausentes:</span>
            <span className="font-bold tabular-nums">{contar('ausente')}</span>
          </div>
        </div>
      )}

      {vista === 'semana' ? (
        <GrillaSemana
          dias={dias}
          turnosPorDia={turnosPorDia}
          ventana={ventana}
          hoy={hoy}
          mostrarProfesional={mostrarProfesional}
        />
      ) : (
        <VistaDia
          turnos={turnosPorDia.get(fecha) ?? []}
          mostrarProfesional={mostrarProfesional}
          sesion={sesion}
          fecha={fecha}
          onCambio={cargar}
        />
      )}

      <LeyendaTipos turnos={turnos} />
    </>
  )
}

export default function PaginaAgenda() {
  return (
    <Suspense fallback={null}>
      <Protegido>{(sesion) => <Contenido sesion={sesion} />}</Protegido>
    </Suspense>
  )
}
