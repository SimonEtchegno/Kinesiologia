'use client'

import { useActionState } from 'react'
import AvisoAccion from '@/componentes/AvisoAccion'
import BotonEnviar from '@/componentes/BotonEnviar'
import { IconoMas } from '@/componentes/Iconos'
import { crearSede } from '../acciones'

/** Alta de una sede nueva del centro. */
export default function FormSede() {
  const [estado, accion] = useActionState(crearSede, {})

  return (
    <form action={accion} key={estado.id ?? 'nueva'}>
      <AvisoAccion error={estado.error} />

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="sede_nombre" className="etiqueta">
            Nombre
          </label>
          <input
            id="sede_nombre"
            name="nombre"
            required
            placeholder="Sede Centro, Sede Norte…"
            className="campo"
          />
        </div>
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="sede_direccion" className="etiqueta">
            Dirección
          </label>
          <input id="sede_direccion" name="direccion" placeholder="Opcional" className="campo" />
        </div>
        <BotonEnviar className="boton-primario mb-0.5" cargando="Agregando…">
          <IconoMas className="size-[1.05rem]" />
          Agregar sede
        </BotonEnviar>
      </div>
    </form>
  )
}
