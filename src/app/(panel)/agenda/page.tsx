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
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
          <span>
            <strong className="font-semibold text-slate-800">{turnos.length}</strong> turnos
          </span>
          <span>
            <strong className="font-semibold text-slate-800">{contar('realizado')}</strong> realizados
          </span>
          <span>
            <strong className="font-semibold text-slate-800">{contar('ausente')}</strong> ausentes
          </span>
          <span>
            <strong className="font-semibold text-slate-800">
              {contar('confirmado') + contar('reprogramado')}
            </strong>{' '}
            pendientes
          </span>
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
