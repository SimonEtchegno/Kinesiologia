'use client'

import { Encabezado } from '@/componentes/ui'
import Protegido from '@/lib/local/Protegido'
import FormProfesional from '../FormProfesional'

/** UC-10 — Dar de alta un kinesiólogo nuevo. */
export default function PaginaNuevoProfesional() {
  return (
    <Protegido soloAdmin>
      {(sesion) => (
        <div className="mx-auto max-w-2xl">
          <Encabezado
            titulo="Nuevo profesional"
            descripcion="Le creamos la cuenta y su agenda propia, vacía."
          />
          <FormProfesional sesion={sesion} />
        </div>
      )}
    </Protegido>
  )
}
