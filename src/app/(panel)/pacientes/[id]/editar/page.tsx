'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Encabezado, Vacio } from '@/componentes/ui'
import { IconoPacientes } from '@/componentes/Iconos'
import type { Paciente } from '@/lib/dominio'
import * as almacen from '@/lib/local/almacen'
import Protegido from '@/lib/local/Protegido'
import type { Sesion } from '@/lib/local/sesion'
import FormularioPaciente from '../../FormularioPaciente'

function Contenido({ sesion, pacienteId }: { sesion: Sesion; pacienteId: string }) {
  const [paciente, setPaciente] = useState<Paciente | null | undefined>(undefined)

  useEffect(() => {
    setPaciente(almacen.pacientePorId(pacienteId))
  }, [pacienteId])

  if (paciente === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-marca-200 border-t-marca-600" />
      </div>
    )
  }
  if (paciente === null) {
    return <Vacio Icono={IconoPacientes} titulo="No encontramos al paciente" texto="Puede que haya sido eliminado." />
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado titulo="Editar paciente" descripcion={paciente.apellido + ', ' + paciente.nombre} />
      <FormularioPaciente sesion={sesion} paciente={paciente} />
    </div>
  )
}

export default function PaginaEditarPaciente() {
  const params = useParams<{ id: string }>()
  return <Protegido>{(sesion) => <Contenido sesion={sesion} pacienteId={params.id} />}</Protegido>
}
