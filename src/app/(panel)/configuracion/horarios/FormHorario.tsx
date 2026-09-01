'use client'

import { useActionState } from 'react'
import AvisoAccion from '@/componentes/AvisoAccion'
import { IconoMas } from '@/componentes/Iconos'
import type { Sede } from '@/lib/dominio'
import { DIAS_CORTOS } from '@/lib/fechas'
import type { Sesion } from '@/lib/local/sesion'
import { agregarHorario, type Resultado } from '../acciones'

/** UC-09 — Alta de una franja de atención, para uno o varios días. */
export default function FormHorario({
  sesion,
  profesionalId,
  sedes,
  onGuardado,
}: {
  sesion: Sesion
  profesionalId: string
  sedes: Sede[]
  onGuardado: () => void
}) {
  const [estado, accion, pendiente] = useActionState<Resultado, FormData>((prev, fd) => {
    const r = agregarHorario(sesion, prev, fd)
    if (r.ok) onGuardado()
    return r
  }, {})

  // Lunes a sábado primero; el domingo al final, como se lee una agenda.
  const orden = [1, 2, 3, 4, 5, 6, 0]

  return (
    <form action={accion}>
      <input type="hidden" name="profesional_id" value={profesionalId} />
      <AvisoAccion error={estado.error} ok={estado.ok} />

      <fieldset className="mb-5">
        <legend className="etiqueta">Días</legend>
        <div className="flex flex-wrap gap-2">
          {orden.map((d) => (
            <label
              key={d}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors has-[:checked]:border-marca-600 has-[:checked]:bg-marca-50 has-[:checked]:text-marca-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name="dias"
                value={d}
                defaultChecked={d >= 1 && d <= 5}
                className="sr-only"
              />
              {DIAS_CORTOS[d]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="hora_inicio" className="etiqueta">
            Desde
          </label>
          <input
            id="hora_inicio"
            name="hora_inicio"
            type="time"
            step={300}
            required
            defaultValue="09:00"
            className="campo w-auto"
          />
        </div>
        <div>
          <label htmlFor="hora_fin" className="etiqueta">
            Hasta
          </label>
          <input
            id="hora_fin"
            name="hora_fin"
            type="time"
            step={300}
            required
            defaultValue="13:00"
            className="campo w-auto"
          />
        </div>

        {sedes.length > 0 && (
          <div>
            <label htmlFor="sede_id" className="etiqueta">
              Sede
            </label>
            <select id="sede_id" name="sede_id" className="campo w-auto">
              <option value="">Sin especificar</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="boton-primario mb-0.5" disabled={pendiente}>
          <IconoMas className="size-[1.05rem]" />
          {pendiente ? 'Agregando…' : 'Agregar franja'}
        </button>
      </div>

      <p className="ayuda">
        Podés cargar varias franjas por día, por ejemplo mañana y tarde con corte al mediodía.
      </p>
    </form>
  )
}
