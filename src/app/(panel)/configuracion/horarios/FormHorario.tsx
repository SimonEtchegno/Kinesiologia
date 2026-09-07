'use client'

import { useActionState, useState } from 'react'
import AvisoAccion from '@/componentes/AvisoAccion'
import BotonEnviar from '@/componentes/BotonEnviar'
import { IconoMas } from '@/componentes/Iconos'
import type { Sede } from '@/lib/dominio'
import { DIAS_CORTOS } from '@/lib/fechas'
import { agregarHorario } from '../acciones'

/** UC-09 — Alta de una franja de atención, para uno o varios días. */
export default function FormHorario({
  profesionalId,
  sedes,
}: {
  profesionalId: string
  sedes: Sede[]
}) {
  const [estado, accion] = useActionState(agregarHorario, {})
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5])

  // Lunes a sábado primero; el domingo al final, como se lee una agenda.
  const orden = [1, 2, 3, 4, 5, 6, 0]

  function alternarDia(d: number) {
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  return (
    <form action={accion}>
      <input type="hidden" name="profesional_id" value={profesionalId} />
      {dias.map((d) => (
        <input key={d} type="hidden" name="dias" value={d} />
      ))}
      <AvisoAccion error={estado.error} ok={estado.ok} />

      <fieldset className="mb-5">
        <legend className="etiqueta">Días</legend>
        <div className="flex flex-wrap gap-2">
          {orden.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => alternarDia(d)}
              aria-pressed={dias.includes(d)}
              className={
                'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ' +
                (dias.includes(d)
                  ? 'border-marca-600 bg-marca-50 text-marca-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')
              }
            >
              {DIAS_CORTOS[d]}
            </button>
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

        <BotonEnviar className="boton-primario mb-0.5" cargando="Agregando…">
          <IconoMas className="size-[1.05rem]" />
          Agregar franja
        </BotonEnviar>
      </div>

      <p className="ayuda">
        Podés cargar varias franjas por día, por ejemplo mañana y tarde con corte al mediodía.
      </p>
    </form>
  )
}
