'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { IconoEscudo, IconoReloj } from '@/componentes/Iconos'
import { Vacio } from '@/componentes/ui'
import { datosParaReservar, type DatosReserva } from '@/lib/reservas'
import FormularioReserva from './FormularioReserva'

/**
 * Página pública de reservas — sin login. Cualquiera con el link del
 * centro (Configuración → Turnos online) llega acá, elige día y horario
 * entre los que están libres, y el turno entra directo en la agenda.
 */
function Contenido() {
  const sp = useSearchParams()
  const centroId = sp.get('c')
  const [datos, setDatos] = useState<DatosReserva | undefined>(undefined)

  useEffect(() => {
    let vigente = true
    datosParaReservar(centroId).then((d) => {
      if (vigente) setDatos(d)
    })
    return () => {
      vigente = false
    }
  }, [centroId])

  return (
    <main className="min-h-dvh bg-gradient-to-br from-marca-50 via-lienzo to-acento-50/60">
      <div className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-marca-600 text-white">
            <IconoEscudo className="size-5" />
          </span>
          <div>
            <p className="font-semibold tracking-tight text-slate-900">
              {datos?.centro?.nombre ?? 'Kinesio'}
            </p>
            <p className="text-xs text-slate-500">Reservá tu turno online</p>
          </div>
        </div>

        {datos === undefined ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-marca-200 border-t-marca-600" />
          </div>
        ) : !datos.centro || !datos.abierto ? (
          <div className="tarjeta-sombra">
            <Vacio
              Icono={IconoReloj}
              titulo="Este link no está disponible"
              texto={
                datos.centro
                  ? 'El centro cerró las reservas online por ahora. Escribiles directamente para coordinar tu turno.'
                  : 'Revisá el link que te compartieron: puede estar incompleto o vencido.'
              }
            />
          </div>
        ) : datos.profesionales.length === 0 ? (
          <div className="tarjeta-sombra">
            <Vacio
              Icono={IconoReloj}
              titulo="No hay horarios cargados todavía"
              texto="El centro todavía no cargó sus horarios de atención. Volvé a intentar más tarde."
            />
          </div>
        ) : (
          <FormularioReserva centro={datos.centro} profesionales={datos.profesionales} sedes={datos.sedes} />
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Esto no reemplaza una urgencia médica. Ante una urgencia, consultá un servicio de
          guardia.
        </p>
      </div>
    </main>
  )
}

export default function PaginaReservar() {
  return (
    <Suspense fallback={null}>
      <Contenido />
    </Suspense>
  )
}
