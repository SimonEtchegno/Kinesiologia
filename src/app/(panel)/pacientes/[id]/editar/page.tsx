import type { Metadata } from 'next'
import Link from 'next/link'
import { Encabezado, Vacio } from '@/componentes/ui'
import { IconoPacientes } from '@/componentes/Iconos'
import { pacientePorId } from '@/lib/datos'
import { exigirSesion } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'
import FormularioPaciente from '../../FormularioPaciente'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await clienteServidor()
  const paciente = await pacientePorId(supabase, id)
  if (!paciente) return { title: 'Paciente no encontrado' }
  return {
    title: `Editar ${paciente.apellido}, ${paciente.nombre}`,
  }
}

export default async function PaginaEditarPaciente({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: pacienteId } = await params
  await exigirSesion()
  const supabase = await clienteServidor()

  const paciente = await pacientePorId(supabase, pacienteId)

  if (!paciente) {
    return (
      <Vacio
        Icono={IconoPacientes}
        titulo="No encontramos al paciente"
        texto="Puede que haya sido eliminado."
        accion={
          <Link href="/pacientes" className="boton-secundario boton-chico">
            Volver a la lista
          </Link>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado
        titulo="Editar paciente"
        descripcion={paciente.apellido + ', ' + paciente.nombre}
      />
      <FormularioPaciente paciente={paciente} />
    </div>
  )
}
