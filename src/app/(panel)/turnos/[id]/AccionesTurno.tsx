'use client'

import { useActionState, useState } from 'react'
import { IconoAlerta, IconoCheck, IconoReloj, IconoX } from '@/componentes/Iconos'
import type { Franja } from '@/lib/datos'
import { cancelarTurno, reprogramarTurno } from '../acciones'

/** UC-04 — Reprogramar o cancelar. */
export default function AccionesTurno({
  turnoId,
  fecha,
  horaActual,
  libres,
}: {
  turnoId: string
  fecha: string
  horaActual: string
  libres: Franja[]
}) {
  const [panel, setPanel] = useState<'nada' | 'reprogramar' | 'cancelar'>('nada')

  const [repro, accionRepro, reproPendiente] = useActionState(reprogramarTurno, {})
  const [cancel, accionCancel, cancelPendiente] = useActionState(cancelarTurno, {})

  const [nuevaFecha, setNuevaFecha] = useState(fecha)
  const [nuevaHora, setNuevaHora] = useState('')

  if (repro.ok || cancel.ok) {
    return (
      <div className="aviso-ok" role="status">
        <IconoCheck className="size-5 shrink-0" />
        <span>{repro.ok ?? cancel.ok}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {panel === 'nada' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPanel('reprogramar')}
            className="boton-secundario boton-chico"
          >
            <IconoReloj className="size-4" />
            Reprogramar
          </button>
          <button
            type="button"
            onClick={() => setPanel('cancelar')}
            className="boton-peligro boton-chico"
          >
            <IconoX className="size-4" />
            Cancelar turno
          </button>
        </div>
      )}

      {panel === 'reprogramar' && (
        <form action={accionRepro} className="rounded-lg border border-linea bg-slate-50/70 p-4">
          <input type="hidden" name="turno_id" value={turnoId} />
          <input type="hidden" name="hora_inicio" value={nuevaHora} />

          <p className="mb-3 font-semibold text-slate-800">Reprogramar</p>

          {repro.error && (
            <div className="aviso-error mb-3" role="alert">
              <IconoAlerta className="size-5 shrink-0" />
              <span>{repro.error}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nueva_fecha" className="etiqueta">
                Nueva fecha
              </label>
              <input
                id="nueva_fecha"
                name="fecha"
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                required
                className="campo"
              />
            </div>
            <div>
              <label htmlFor="nueva_hora" className="etiqueta">
                Nuevo horario
              </label>
              <input
                id="nueva_hora"
                type="time"
                step={300}
                value={nuevaHora}
                onChange={(e) => setNuevaHora(e.target.value)}
                required
                className="campo"
              />
            </div>
          </div>

          {nuevaFecha === fecha && libres.length > 0 && (
            <div className="mt-3">
              <p className="rotulo-seccion mb-2">Libres ese día</p>
              <div className="flex flex-wrap gap-1.5">
                {libres.map((f) => (
                  <button
                    key={f.inicio}
                    type="button"
                    onClick={() => setNuevaHora(f.inicio)}
                    className={
                      'rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors ' +
                      (nuevaHora === f.inicio
                        ? 'border-marca-600 bg-marca-600 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-marca-400')
                    }
                  >
                    {f.inicio}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="forzar_fuera_de_horario"
              value="si"
              className="size-4 rounded border-slate-300"
            />
            Permitir fuera del horario de atención
          </label>

          <p className="ayuda">
            Horario actual: {horaActual}. Se mantiene la duración de la sesión.
          </p>

          <div className="mt-4 flex gap-2">
            <button type="submit" className="boton-primario boton-chico" disabled={reproPendiente}>
              {reproPendiente ? 'Guardando…' : 'Confirmar cambio'}
            </button>
            <button
              type="button"
              onClick={() => setPanel('nada')}
              className="boton-fantasma boton-chico"
            >
              Volver
            </button>
          </div>
        </form>
      )}

      {panel === 'cancelar' && (
        <form action={accionCancel} className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
          <input type="hidden" name="turno_id" value={turnoId} />

          <p className="mb-3 font-semibold text-rose-900">Cancelar el turno</p>

          {cancel.error && (
            <div className="aviso-error mb-3" role="alert">
              <IconoAlerta className="size-5 shrink-0" />
              <span>{cancel.error}</span>
            </div>
          )}

          <label htmlFor="motivo" className="etiqueta">
            Motivo (opcional)
          </label>
          <input
            id="motivo"
            name="motivo"
            placeholder="Avisó el paciente, feriado, superposición…"
            className="campo"
          />
          <p className="ayuda">
            El horario queda libre para otro turno y el cambio queda registrado.
          </p>

          <div className="mt-4 flex gap-2">
            <button type="submit" className="boton-peligro boton-chico" disabled={cancelPendiente}>
              {cancelPendiente ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
            <button
              type="button"
              onClick={() => setPanel('nada')}
              className="boton-fantasma boton-chico"
            >
              No, volver
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
