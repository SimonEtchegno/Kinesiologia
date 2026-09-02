import type { Metadata } from 'next'
import { Encabezado } from '@/componentes/ui'
import { exigirSesion } from '@/lib/sesion'
import FormularioPaciente from '../FormularioPaciente'

export const metadata: Metadata = {
  title: 'Nuevo paciente',
}

/** UC-08 — Dar de alta un paciente nuevo. */
export default async function PaginaNuevoPaciente() {
  await exigirSesion()

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado
        titulo="Nuevo paciente"
        descripcion="Con el nombre y la cobertura ya podés asignarle turnos."
      />
      <FormularioPaciente />
    </div>
  )
}
