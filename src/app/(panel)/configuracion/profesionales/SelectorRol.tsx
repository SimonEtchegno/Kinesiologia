'use client'

import type { Rol } from '@/lib/dominio'
import { cambiarRolProfesional } from '../acciones'

/** Cambia el rol de un profesional apenas se elige la opción. */
export default function SelectorRol({
  perfilId,
  nombre,
  rolActual,
}: {
  perfilId: string
  nombre: string
  rolActual: Rol
}) {
  return (
    <form action={cambiarRolProfesional}>
      <input type="hidden" name="id" value={perfilId} />
      <label className="sr-only" htmlFor={'rol-' + perfilId}>
        Rol de {nombre}
      </label>
      <select
        id={'rol-' + perfilId}
        name="rol"
        defaultValue={rolActual}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="campo w-auto py-1.5 text-sm"
      >
        <option value="kinesiologo">Kinesiólogo/a</option>
        <option value="admin">Administrador</option>
      </select>
    </form>
  )
}
