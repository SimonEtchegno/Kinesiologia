'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Encabezado } from '@/componentes/ui'
import type { Franja } from '@/lib/local/almacen'
import type { Paciente, Perfil, Sede } from '@/lib/dominio'
import { esISO, formatearFechaLarga, hoyISO } from '@/lib/fechas'
import * as almacen from '@/lib/local/almacen'
import Protegido from '@/lib/local/Protegido'
import type { Sesion } from '@/lib/local/sesion'
import FormularioTurno from './FormularioTurno'

function Contenido({ sesion }: { sesion: Sesion }) {
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    if (!sesion.puedeCargarTurnos) router.replace('/agenda')
  }, [sesion.puedeCargarTurnos, router])

  const fecha = esISO(sp.get('fecha')) ? sp.get('fecha')! : hoyISO()

  const [profesionalesTodos, setProfesionalesTodos] = useState<Perfil[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [disponibilidad, setDisponibilidad] = useState<{ libres: Franja[]; ocupados: Franja[]; atiende: boolean }>({
    libres: [], ocupados: [], atiende: true,
  })

  useEffect(() => {
    setProfesionalesTodos(almacen.listarProfesionales(sesion.centro.id))
    setSedes(almacen.listarSedes(sesion.centro.id))
    setPacientes(almacen.buscarPacientes(sesion.centro.id, ''))
  }, [sesion.centro.id])

  const profesionales = sesion.esAdmin
    ? profesionalesTodos
    : profesionalesTodos.filter((p) => p.id === sesion.perfil.id)

  const pedido = sp.get('prof') && profesionales.some((p) => p.id === sp.get('prof')) ? sp.get('prof')! : undefined
  const profesionalId =
    pedido ??
    (profesionales.some((p) => p.id === sesion.perfil.id) ? sesion.perfil.id : (profesionales[0]?.id ?? sesion.perfil.id))

  const duracion = sesion.centro.duracion_turno_min

  useEffect(() => {
    if (!profesionalId) return
    setDisponibilidad(almacen.slotsDisponibles(profesionalId, fecha, duracion))
  }, [profesionalId, fecha, duracion])

  if (!sesion.puedeCargarTurnos || profesionales.length === 0) return null

  const pacienteParam = sp.get('paciente')

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado
        titulo="Nuevo turno"
        descripcion={<span className="first-letter:uppercase">{formatearFechaLarga(fecha)}</span>}
      />

      <FormularioTurno
        sesion={sesion}
        fecha={fecha}
        profesionalId={profesionalId}
        profesionales={profesionales}
        sedes={sedes}
        pacientes={pacientes}
        libres={disponibilidad.libres}
        ocupados={disponibilidad.ocupados}
        atiende={disponibilidad.atiende}
        duracion={duracion}
        puedeElegirProfesional={sesion.esAdmin && profesionales.length > 1}
        pacienteInicial={pacienteParam && pacientes.some((p) => p.id === pacienteParam) ? pacienteParam : undefined}
      />
    </div>
  )
}

export default function PaginaNuevoTurno() {
  return (
    <Suspense fallback={null}>
      <Protegido>{(sesion) => <Contenido sesion={sesion} />}</Protegido>
    </Suspense>
  )
}
