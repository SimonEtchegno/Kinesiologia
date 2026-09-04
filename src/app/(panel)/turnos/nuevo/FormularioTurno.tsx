'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useCallback, useEffect, useState } from 'react'
import { IconoAlerta, IconoCheck, IconoReloj } from '@/componentes/Iconos'
import BotonEnviar from '@/componentes/BotonEnviar'
import EnviarWhatsApp from '@/componentes/EnviarWhatsApp'
import SelectorPaciente from '@/componentes/SelectorPaciente'
import SelectTipoSesion from '@/componentes/SelectTipoSesion'
import type { Franja } from '@/lib/datos'
import {
  esIngreso,
  TIPO_INGRESO,
  TIPO_SESION_POR_DEFECTO,
  type Centro,
  type Paciente,
  type Perfil,
  type Sede,
} from '@/lib/dominio'
import { hhmm } from '@/lib/fechas'
import { mensajeSegunTipo } from '@/lib/whatsapp'
import { crearTurno } from '../acciones'

interface TurnoCreado {
  id: string
  tipo: string
  fecha: string
  hora: string
  profesional: string
  sede: string | null
  pacienteNombre: string
  pacienteTelefono: string | null
}

interface Props {
  centro: Centro
  fecha: string
  profesionalId: string
  profesionales: Perfil[]
  sedes: Sede[]
  pacientes: Paciente[]
  /** Ids de pacientes que ya tuvieron algún turno: si no está acá, es un ingreso. */
  pacientesConTurnoPrevio: string[]
  libres: Franja[]
  ocupados: Franja[]
  atiende: boolean
  duracion: number
  puedeElegirProfesional: boolean
  pacienteInicial?: string
}

export default function FormularioTurno({
  centro,
  fecha,
  profesionalId,
  profesionales,
  sedes,
  pacientes,
  pacientesConTurnoPrevio,
  libres,
  ocupados,
  atiende,
  duracion,
  puedeElegirProfesional,
  pacienteInicial,
}: Props) {
  const router = useRouter()
  const [creado, setCreado] = useState<TurnoCreado | null>(null)
  const [estado, accion] = useActionState(async (prev: Awaited<ReturnType<typeof crearTurno>>, fd: FormData) => {
    const r = await crearTurno(prev, fd)
    if (r.ok && r.id) {
      const pacienteId = String(fd.get('paciente_id') ?? '')
      const esNuevo = pacienteId === '__nuevo'
      const existente = pacientes.find((p) => p.id === pacienteId)
      setCreado({
        id: r.id,
        tipo: String(fd.get('tipo_sesion') ?? ''),
        fecha: String(fd.get('fecha') ?? fecha),
        hora: String(fd.get('hora_inicio') ?? ''),
        profesional: profesionales.find((p) => p.id === String(fd.get('profesional_id')))?.nombre ?? '',
        sede: sedes.find((s) => s.id === String(fd.get('sede_id')))?.nombre ?? null,
        pacienteNombre: esNuevo
          ? String(fd.get('nuevo_nombre') ?? '').trim()
          : (existente?.nombre ?? ''),
        pacienteTelefono: esNuevo
          ? String(fd.get('nuevo_telefono') ?? '').trim() || null
          : (existente?.telefono ?? null),
      })
    }
    return r
  }, {})
  const [hora, setHora] = useState('')
  const [manual, setManual] = useState(false)
  const [tipo, setTipo] = useState<string>(TIPO_SESION_POR_DEFECTO)
  const [tipoAMano, setTipoAMano] = useState(false)
  const [primeraVez, setPrimeraVez] = useState(false)

  const tuvoTurnos = new Set(pacientesConTurnoPrevio)

  // Un paciente sin turnos previos arranca marcado como Ingreso; si el
  // profesional ya eligió otro tipo a mano, no se lo pisamos.
  const alElegirPaciente = useCallback(
    (pacienteId: string) => {
      const sinHistoria = pacienteId === '__nuevo' || (!!pacienteId && !tuvoTurnos.has(pacienteId))
      setPrimeraVez(sinHistoria)
      if (!tipoAMano) setTipo(sinHistoria ? TIPO_INGRESO : TIPO_SESION_POR_DEFECTO)
    },
    [tipoAMano, tuvoTurnos],
  )

  useEffect(() => {
    if (pacienteInicial) alElegirPaciente(pacienteInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteInicial])

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

  if (creado) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="tarjeta-sombra p-7">
          <span className="grid size-12 place-items-center rounded-xl2 bg-acento-50 text-acento-600">
            <IconoCheck className="size-7" />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            Turno de {creado.pacienteNombre || 'el paciente'} cargado
          </h2>
          <p className="subtitulo mt-1 first-letter:uppercase">
            {creado.fecha === fecha ? '' : creado.fecha + ' · '}
            {hhmm(creado.hora)} con {creado.profesional}
            {creado.sede ? ' · ' + creado.sede : ''}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <EnviarWhatsApp
              telefono={creado.pacienteTelefono}
              variante="acento"
              etiqueta={esIngreso(creado.tipo) ? 'WhatsApp de bienvenida' : 'Avisar por WhatsApp'}
              autoAbrir={centro.whatsapp_ingreso_automatico}
              mensaje={mensajeSegunTipo({
                centro: centro.nombre,
                paciente: creado.pacienteNombre.split(' ')[0] || creado.pacienteNombre,
                profesional: creado.profesional,
                fecha: creado.fecha,
                hora: hhmm(creado.hora),
                sede: creado.sede,
                tipo: creado.tipo,
              })}
            />
            <Link
              href={'/agenda?fecha=' + creado.fecha + '&vista=dia'}
              className="boton-secundario boton-chico"
            >
              Ir a la agenda
            </Link>
            <Link href={'/turnos/' + creado.id} className="boton-fantasma boton-chico">
              Ver el turno
            </Link>
          </div>
        </div>
      </div>
    )
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
              name={puedeElegirProfesional ? 'profesional_id' : undefined}
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
            {/* Un <select disabled> no manda su valor al enviar el formulario. */}
            {!puedeElegirProfesional && (
              <input type="hidden" name="profesional_id" value={profesionalId} />
            )}
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
        <SelectorPaciente
          pacientes={pacientes}
          inicial={pacienteInicial}
          onCambio={alElegirPaciente}
        />
      </section>

      {/* --- Detalle --- */}
      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Detalle de la sesión</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tipo_sesion" className="etiqueta">
              Tipo de sesión
            </label>
            <SelectTipoSesion
              valor={tipo}
              onCambio={(v) => {
                setTipo(v)
                setTipoAMano(true)
              }}
            />
            {primeraVez && esIngreso(tipo) && (
              <p className="ayuda text-violet-700">
                Es la primera sesión de este paciente: queda cargada como ingreso.
              </p>
            )}
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
        <BotonEnviar className="boton-primario" disabled={!hora} cargando="Guardando…">
          Confirmar turno
        </BotonEnviar>
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
