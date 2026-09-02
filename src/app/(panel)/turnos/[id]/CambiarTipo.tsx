'use client'

import { useActionState, useState } from 'react'
import { IconoAlerta } from '@/componentes/Iconos'
import SelectTipoSesion from '@/componentes/SelectTipoSesion'
import { cambiarTipoSesion } from '../acciones'

/** Corregir el tipo de sesión (y con eso, el color en la agenda). */
export default function CambiarTipo({
  turnoId,
  tipoActual,
}: {
  turnoId: string
  tipoActual: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState(tipoActual)
  const [estado, accion, pendiente] = useActionState(async (prev: Awaited<ReturnType<typeof cambiarTipoSesion>>, fd: FormData) => {
    const r = await cambiarTipoSesion(prev, fd)
    if (r.ok) setAbierto(false)
    return r
  }, {})

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => {
          setTipo(tipoActual)
          setAbierto(true)
        }}
        className="boton-fantasma boton-chico -ml-3"
      >
        Cambiar tipo
      </button>
    )
  }

  return (
    <form action={accion} className="mt-2 w-full rounded-lg border border-linea bg-slate-50/70 p-4">
      <input type="hidden" name="turno_id" value={turnoId} />

      {estado.error && (
        <div className="aviso-error mb-3" role="alert">
          <IconoAlerta className="size-5 shrink-0" />
          <span>{estado.error}</span>
        </div>
      )}

      <label htmlFor="tipo_sesion_editar" className="etiqueta">
        Tipo de sesión
      </label>
      <SelectTipoSesion id="tipo_sesion_editar" valor={tipo} onCambio={setTipo} />

      <div className="mt-3 flex gap-2">
        <button type="submit" className="boton-primario boton-chico" disabled={pendiente}>
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="boton-fantasma boton-chico"
        >
          Volver
        </button>
      </div>
    </form>
  )
}
