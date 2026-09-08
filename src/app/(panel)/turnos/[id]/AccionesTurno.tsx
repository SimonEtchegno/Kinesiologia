'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { IconoAlerta, IconoCheck, IconoReloj, IconoX } from '@/componentes/Iconos'
import BotonEnviar from '@/componentes/BotonEnviar'
import EnviarWhatsApp from '@/componentes/EnviarWhatsApp'
import type { Franja } from '@/lib/datos'
import { linkWhatsApp, mensajeCancelado, mensajeReprogramado } from '@/lib/whatsapp'
import { cancelarTurno, reprogramarTurno } from '../acciones'

/** Lo que hace falta para armar el mensaje de WhatsApp al reprogramar. */
export interface DatosAviso {
  centro: string
  paciente: string
  pacienteTelefono: string | null
  profesional?: string | null
  sede?: string | null
  tipo: string
  whatsappAutomatico: boolean
}

/** UC-04 — Reprogramar o cancelar. */
export default function AccionesTurno({
  turnoId,
  fecha,
  horaActual,
  libres,
  aviso,
}: {
  turnoId: string
  fecha: string
  horaActual: string
  libres: Franja[]
  aviso: DatosAviso
}) {
  const [panel, setPanel] = useState<'nada' | 'reprogramar' | 'cancelar'>('nada')

  const [repro, accionRepro] = useActionState(reprogramarTurno, {})
  const [cancel, accionCancel] = useActionState(cancelarTurno, {})

  const [nuevaFecha, setNuevaFecha] = useState(fecha)
  const [nuevaHora, setNuevaHora] = useState('')

  // Pestaña de WhatsApp abierta en el mismo clic que confirma el cambio:
  // así el navegador la sigue considerando una acción directa del usuario
  // y no la bloquea al recién saber el resultado del Server Action.
  const ventanaRef = useRef<Window | null>(null)
  const [waBloqueado, setWaBloqueado] = useState(false)
  function prepararVentana() {
    ventanaRef.current = aviso.whatsappAutomatico
      ? window.open('about:blank', '_blank')
      : null
  }
  useEffect(() => {
    if ((repro.error || cancel.error) && ventanaRef.current) {
      ventanaRef.current.close()
      ventanaRef.current = null
    }
  }, [repro.error, cancel.error])

  // Redirige (o abre) la pestaña ya preparada al mensaje real. Lo hace el
  // mismo componente que la abrió: nunca se le pasa la ventana a un hijo
  // para que la mute.
  function abrirEnlaceAutomatico(enlace: string | null) {
    if (!enlace) {
      ventanaRef.current?.close()
      ventanaRef.current = null
      return
    }
    if (ventanaRef.current) {
      ventanaRef.current.location.href = enlace
    } else if (!window.open(enlace, '_blank')) {
      setWaBloqueado(true)
    }
    ventanaRef.current = null
  }

  useEffect(() => {
    if (!repro.ok || !aviso.whatsappAutomatico) return
    abrirEnlaceAutomatico(
      linkWhatsApp(
        aviso.pacienteTelefono ?? '',
        mensajeReprogramado({
          centro: aviso.centro,
          paciente: aviso.paciente,
          profesional: aviso.profesional,
          fecha: nuevaFecha,
          hora: nuevaHora,
          sede: aviso.sede,
          tipo: aviso.tipo,
        }),
      ),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repro.ok])

  useEffect(() => {
    if (!cancel.ok || !aviso.whatsappAutomatico) return
    abrirEnlaceAutomatico(
      linkWhatsApp(
        aviso.pacienteTelefono ?? '',
        mensajeCancelado({
          centro: aviso.centro,
          paciente: aviso.paciente,
          profesional: aviso.profesional,
          fecha,
          hora: horaActual,
          sede: aviso.sede,
          tipo: aviso.tipo,
        }),
      ),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancel.ok])

  if (repro.ok) {
    return (
      <div className="space-y-3">
        <div className="aviso-ok" role="status">
          <IconoCheck className="size-5 shrink-0" />
          <span>{repro.ok}</span>
        </div>
        <EnviarWhatsApp
          telefono={aviso.pacienteTelefono}
          etiqueta="Avisar por WhatsApp"
          abiertoInicialmente={aviso.whatsappAutomatico}
          bloqueadoInicial={waBloqueado}
          mensaje={mensajeReprogramado({
            centro: aviso.centro,
            paciente: aviso.paciente,
            profesional: aviso.profesional,
            fecha: nuevaFecha,
            hora: nuevaHora,
            sede: aviso.sede,
            tipo: aviso.tipo,
          })}
        />
      </div>
    )
  }

  if (cancel.ok) {
    return (
      <div className="space-y-3">
        <div className="aviso-ok" role="status">
          <IconoCheck className="size-5 shrink-0" />
          <span>{cancel.ok}</span>
        </div>
        <EnviarWhatsApp
          telefono={aviso.pacienteTelefono}
          etiqueta="Avisar por WhatsApp"
          abiertoInicialmente={aviso.whatsappAutomatico}
          bloqueadoInicial={waBloqueado}
          mensaje={mensajeCancelado({
            centro: aviso.centro,
            paciente: aviso.paciente,
            profesional: aviso.profesional,
            fecha,
            hora: horaActual,
            sede: aviso.sede,
            tipo: aviso.tipo,
          })}
        />
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
            <BotonEnviar
              className="boton-primario boton-chico"
              cargando="Guardando…"
              onClick={prepararVentana}
            >
              Confirmar cambio
            </BotonEnviar>
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
            <BotonEnviar
              className="boton-peligro boton-chico"
              cargando="Cancelando…"
              onClick={prepararVentana}
            >
              Sí, cancelar
            </BotonEnviar>
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
