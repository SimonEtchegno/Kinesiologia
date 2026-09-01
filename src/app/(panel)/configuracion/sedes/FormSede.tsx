'use client'

import { useActionState } from 'react'
import AvisoAccion from '@/componentes/AvisoAccion'
import { IconoMas } from '@/componentes/Iconos'
import type { Sesion } from '@/lib/local/sesion'
import { crearSede, type Resultado } from '../acciones'

/** Alta de una sede nueva del centro. */
export default function FormSede({ sesion, onCreada }: { sesion: Sesion; onCreada: () => void }) {
  const [estado, accion, pendiente] = useActionState<Resultado, FormData>((prev, fd) => {
    const r = crearSede(sesion, prev, fd)
    if (r.ok) onCreada()
    return r
  }, {})

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
        <button type="submit" className="boton-primario mb-0.5" disabled={pendiente}>
          <IconoMas className="size-[1.05rem]" />
          {pendiente ? 'Agregando…' : 'Agregar sede'}
        </button>
      </div>
    </form>
  )
}
