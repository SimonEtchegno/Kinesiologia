import { Encabezado } from '@/componentes/ui'
import { exigirAdmin } from '@/lib/sesion'
import FormProfesional from '../FormProfesional'

/** UC-10 — Dar de alta un kinesiólogo nuevo. */
export default async function PaginaNuevoProfesional() {
  await exigirAdmin()

  return (
    <div className="mx-auto max-w-2xl">
      <Encabezado
        titulo="Nuevo profesional"
        descripcion="Le creamos la cuenta y su agenda propia, vacía."
      />
      <FormProfesional />
    </div>
  )
}
