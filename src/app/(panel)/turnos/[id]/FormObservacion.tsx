'use client'

import { useActionState, useState } from 'react'
import BotonEnviar from '@/componentes/BotonEnviar'
import { IconoAlerta, IconoCheck, IconoNota } from '@/componentes/Iconos'
import type { Observacion } from '@/lib/dominio'
import { guardarObservacion } from '../acciones'

/**
 * UC-06 — Observación clínica.
 * Pensado para completarse en menos de un minuto: cuatro campos,
 * dolor en un solo clic y atajo Ctrl+Enter para guardar.
 */
const SUGERENCIAS_PROXIMA = [
  'En 2 días',
  'En 3 días',
  'Próxima semana',
  'En 15 días',
  'Alta kinésica',
]

export default function FormObservacion({
  turnoId,
  observacion,
}: {
  turnoId: string
  observacion: Observacion | null
}) {
  const [estado, accion] = useActionState(guardarObservacion, {})
  const [dolor, setDolor] = useState<string>(
    observacion?.dolor_referido != null ? String(observacion.dolor_referido) : '',
  )
  const [proxima, setProxima] = useState(observacion?.proxima_sesion_sugerida ?? '')

  return (
    <form
      action={accion}
      id="observacion"
      className="tarjeta scroll-mt-6 p-5"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.currentTarget.requestSubmit()
        }
      }}
    >
      <input type="hidden" name="turno_id" value={turnoId} />
      <input type="hidden" name="dolor_referido" value={dolor} />
      <input type="hidden" name="proxima_sesion_sugerida" value={proxima} />

      <div className="mb-4 flex items-center gap-2">
        <IconoNota className="size-5 text-marca-600" />
        <h2 className="font-semibold text-slate-900">
          {observacion ? 'Observación de la sesión' : 'Cargar observación de la sesión'}
        </h2>
      </div>

      {estado.error && (
        <div className="aviso-error mb-4" role="alert">
          <IconoAlerta className="size-5 shrink-0" />
          <span>{estado.error}</span>
        </div>
      )}
      {estado.ok && (
        <div className="aviso-ok mb-4" role="status">
          <IconoCheck className="size-5 shrink-0" />
          <span>{estado.ok}</span>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="evolucion" className="etiqueta">
            Evolución
          </label>
          <textarea
            id="evolucion"
            name="evolucion"
            rows={3}
            required
            autoFocus={!observacion}
            defaultValue={observacion?.evolucion ?? ''}
            placeholder="Qué se trabajó y cómo respondió el paciente."
            className="campo resize-y"
          />
        </div>

        <div>
          <span className="etiqueta">Dolor referido</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: 11 }, (_, i) => String(i)).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDolor(dolor === n ? '' : n)}
                aria-pressed={dolor === n}
                className={
                  'size-9 rounded-lg border text-sm font-semibold tabular-nums transition-colors ' +
                  (dolor === n
                    ? 'border-marca-600 bg-marca-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-marca-400 hover:bg-marca-50')
                }
              >
                {n}
              </button>
            ))}
          </div>
          <p className="ayuda">0 sin dolor · 10 el peor imaginable. Opcional.</p>
        </div>

        <div>
          <label htmlFor="ejercicios_indicados" className="etiqueta">
            Ejercicios indicados
          </label>
          <textarea
            id="ejercicios_indicados"
            name="ejercicios_indicados"
            rows={2}
            defaultValue={observacion?.ejercicios_indicados ?? ''}
            placeholder="Para hacer en casa hasta la próxima sesión."
            className="campo resize-y"
          />
        </div>

        <div>
          <label htmlFor="proxima_texto" className="etiqueta">
            Próxima sesión sugerida
          </label>
          <input
            id="proxima_texto"
            value={proxima}
            onChange={(e) => setProxima(e.target.value)}
            placeholder="Cuándo conviene volver"
            className="campo"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGERENCIAS_PROXIMA.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setProxima(s)}
                className={
                  'rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ' +
                  (proxima === s
                    ? 'bg-acento-600 text-white ring-acento-600'
                    : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50')
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <BotonEnviar className="boton-acento" cargando="Guardando…">
          {observacion ? 'Guardar cambios' : 'Guardar observación'}
        </BotonEnviar>
        <p className="text-xs text-slate-400">Ctrl + Enter para guardar</p>
      </div>
    </form>
  )
}
