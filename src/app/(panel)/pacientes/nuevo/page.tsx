'use client'

import { Encabezado } from '@/componentes/ui'
import Protegido from '@/lib/local/Protegido'
import FormularioPaciente from '../FormularioPaciente'

/** UC-08 — Dar de alta un paciente nuevo. */
export default function PaginaNuevoPaciente() {
  return (
    <Protegido>
      {(sesion) => (
        <div className="mx-auto max-w-3xl">
          <Encabezado
            titulo="Nuevo paciente"
            descripcion="Con el nombre y la cobertura ya podés asignarle turnos."
          />
          <FormularioPaciente sesion={sesion} />
        </div>
      )}
    </Protegido>
  )
}
