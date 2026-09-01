'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useState } from 'react'
import { IconoAlerta, IconoReloj } from '@/componentes/Iconos'
import SelectorPaciente from '@/componentes/SelectorPaciente'
import type { Franja } from '@/lib/local/almacen'
import { TIPOS_SESION, type Paciente, type Perfil, type Sede } from '@/lib/dominio'
import { hhmm } from '@/lib/fechas'
import type { Sesion } from '@/lib/local/sesion'
import { crearTurno, type Resultado } from '../acciones'

interface Props {
  sesion: Sesion
  fecha: string
  profesionalId: string
  profesionales: Perfil[]
  sedes: Sede[]
  pacientes: Paciente[]
  libres: Franja[]
  ocupados: Franja[]
  atiende: boolean
  duracion: number
  puedeElegirProfesional: boolean
  pacienteInicial?: string
}

export default function FormularioTurno({
  sesion,
  fecha,
  profesionalId,
  profesionales,
  sedes,
  pacientes,
  libres,
  ocupados,
  atiende,
  duracion,
  puedeElegirProfesional,
  pacienteInicial,
}: Props) {
  const router = useRouter()
  const [estado, accion, pendiente] = useActionState<Resultado, FormData>((prev, fd) => {
    const r = crearTurno(sesion, prev, fd)
    if (r.ok) router.push('/agenda?fecha=' + fecha + '&vista=dia&nuevo=' + r.id)
    return r
  }, {})
  const [hora, setHora] = useState('')
  const [manual, setManual] = useState(false)

  // Cambiar profesional o fecha recarga la grilla de horarios desde el servidor.
  function recargar(cambios: { prof?: string; fecha?: string }) {
    const p = new URLSearchParams({
      fecha: cambios.fecha ?? fecha,
      prof: cambios.prof ?? profesionalId,
    })
    // Si venimos desde la ficha de un paciente, no lo perdemos al recargar.
    if (pacienteInicial) p.set('paciente', pacienteInicial)
    setHora('')
    router.replace('/turnos/nuevo?' + p.toString())
  }

  return (
    <form action={accion} className="space-y-6">
      <input type="hidden" name="duracion" value={duracion} />

      {estado.error && (
        <div className="aviso-error" role="alert">
          <IconoAlerta className="size-5 shrink-0" />
          <span>{estado.error}</span>
        </div>
      )}

      {/* --- Profesional, fecha --- */}
      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Cuándo y con quién</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profesional_id" className="etiqueta">
              Profesional
            </label>
            <select
              id="profesional_id"
              name="profesional_id"
              value={profesionalId}
              disabled={!puedeElegirProfesional}
              onChange={(e) => recargar({ prof: e.target.value })}
              className="campo"
            >
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.especialidad ? ' — ' + p.especialidad : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="fecha" className="etiqueta">
              Fecha
            </label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && recargar({ fecha: e.target.value })}
              className="campo"
              required
            />
          </div>
        </div>
      </section>

      {/* --- Horario --- */}
      <section className="tarjeta p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Horario</h2>
          <p className="text-xs text-slate-500">Sesiones de {duracion} minutos</p>
        </div>

        {!atiende ? (
          <div className="aviso-info">
            <IconoReloj className="size-5 shrink-0" />
            <div>
              <p className="font-semibold">Ese día el profesional no tiene horarios de atención.</p>
              <p className="mt-1">
                Podés cargarlos en{' '}
                <Link href="/configuracion/horarios" className="underline">
                  Configuración → Horarios
                </Link>
                , elegir otra fecha, o poner un horario a mano acá abajo.
              </p>
            </div>
          </div>
        ) : libres.length === 0 ? (
          <div className="aviso-info">
            <IconoReloj className="size-5 shrink-0" />
            <span>La agenda de ese día está completa. Probá otra fecha.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {libres.map((f) => (
              <button
                key={f.inicio}
                type="button"
                onClick={() => {
                  setHora(f.inicio)
                  setManual(false)
                }}
                aria-pressed={hora === f.inicio && !manual}
                className={
                  'rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums transition-colors ' +
                  (hora === f.inicio && !manual
                    ? 'border-marca-600 bg-marca-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-marca-400 hover:bg-marca-50')
                }
              >
                {f.inicio}
              </button>
            ))}
          </div>
        )}

        {ocupados.length > 0 && (
          <p className="ayuda">
            Ya ocupado ese día: {ocupados.map((o) => o.inicio + '–' + o.fin).join(', ')}.
          </p>
        )}

        {/* Escape para casos fuera de la grilla */}
        <div className="mt-4 border-t border-linea pt-4">
          {manual ? (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="hora_manual" className="etiqueta">
                  Horario a mano
                </label>
                <input
                  id="hora_manual"
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  step={300}
                  className="campo w-auto"
                />
              </div>
              <label className="flex items-center gap-2 pb-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  name="forzar_fuera_de_horario"
                  value="si"
                  className="size-4 rounded border-slate-300"
                />
                Permitir fuera del horario de atención
              </label>
              <button
                type="button"
                onClick={() => setManual(false)}
                className="boton-fantasma boton-chico mb-1.5"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setManual(true)}
              className="boton-fantasma boton-chico"
            >
              Poner otro horario a mano
            </button>
          )}
        </div>

        <input type="hidden" name="hora_inicio" value={hora} />
      </section>

      {/* --- Paciente --- */}
      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Paciente</h2>
        <SelectorPaciente pacientes={pacientes} inicial={pacienteInicial} />
      </section>

      {/* --- Detalle --- */}
      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Detalle de la sesión</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tipo_sesion" className="etiqueta">
              Tipo de sesión
            </label>
            <select id="tipo_sesion" name="tipo_sesion" className="campo" defaultValue={TIPOS_SESION[0]}>
              {TIPOS_SESION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {sedes.length > 0 && (
            <div>
              <label htmlFor="sede_id" className="etiqueta">
                Sede
              </label>
              <select id="sede_id" name="sede_id" className="campo" defaultValue={sedes[0]?.id ?? ''}>
                <option value="">Sin especificar</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="boton-primario" disabled={pendiente || !hora}>
          {pendiente ? 'Guardando…' : 'Confirmar turno'}
        </button>
        <Link href={'/agenda?fecha=' + fecha} className="boton-secundario">
          Volver a la agenda
        </Link>
        {hora && (
          <p className="text-sm text-slate-500">
            Queda de <strong className="font-semibold text-slate-800">{hhmm(hora)}</strong> en
            adelante, {duracion} min.
          </p>
        )}
      </div>
    </form>
  )
}
