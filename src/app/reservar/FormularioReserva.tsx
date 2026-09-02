'use client'

import { useActionState, useEffect, useState } from 'react'
import { IconoAlerta, IconoCheck, IconoReloj, IconoSede } from '@/componentes/Iconos'
import EnviarWhatsApp from '@/componentes/EnviarWhatsApp'
import { COBERTURAS } from '@/lib/dominio'
import { formatearFechaLarga, hhmm, hoyISO, sumarDias } from '@/lib/fechas'
import * as almacen from '@/lib/local/almacen'
import type { DatosReserva, Franja } from '@/lib/local/almacen'
import { reservarTurno, type ResultadoReserva } from './acciones'

interface Confirmado {
  fecha: string
  hora: string
  profesional: string
  sede: string | null
  paciente: string
}

export default function FormularioReserva({
  centro,
  profesionales,
  sedes,
}: {
  centro: NonNullable<DatosReserva['centro']>
  profesionales: DatosReserva['profesionales']
  sedes: DatosReserva['sedes']
}) {
  const hoy = hoyISO()
  const [profesionalId, setProfesionalId] = useState(profesionales[0]?.id ?? '')
  const [fecha, setFecha] = useState(hoy)
  const [sedeId, setSedeId] = useState(sedes[0]?.id ?? '')
  const [hora, setHora] = useState('')
  const [cobertura, setCobertura] = useState<'particular' | 'obra_social'>('particular')
  const [libres, setLibres] = useState<Franja[]>([])
  const [confirmado, setConfirmado] = useState<Confirmado | null>(null)

  const [estado, accion, pendiente] = useActionState<ResultadoReserva, FormData>((prev, fd) => {
    const r = reservarTurno(centro.id, prev, fd)
    if (r.ok) {
      setConfirmado({
        fecha: String(fd.get('fecha')),
        hora: String(fd.get('hora_inicio')),
        profesional: profesionales.find((p) => p.id === fd.get('profesional_id'))?.nombre ?? '',
        sede: sedes.find((s) => s.id === fd.get('sede_id'))?.nombre ?? null,
        paciente: String(fd.get('nombre')).trim(),
      })
    }
    return r
  }, {})

  useEffect(() => {
    if (!profesionalId) return
    setHora('')
    setLibres(almacen.slotsPublicos(centro.id, profesionalId, fecha, centro.duracion_turno_min))
  }, [centro.id, centro.duracion_turno_min, profesionalId, fecha])

  if (confirmado) {
    const cuando =
      formatearFechaLarga(confirmado.fecha) + ' a las ' + hhmm(confirmado.hora)
    return (
      <div className="tarjeta-sombra p-7">
        <span className="grid size-12 place-items-center rounded-xl2 bg-acento-50 text-acento-600">
          <IconoCheck className="size-7" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
          ¡Listo, {confirmado.paciente}! Tu turno quedó reservado
        </h2>
        <p className="subtitulo mt-1 first-letter:uppercase">{cuando}</p>

        <dl className="mt-5 grid gap-3 rounded-lg border border-linea bg-slate-50/70 p-4 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-500">Profesional</dt>
            <dd className="font-medium text-slate-800">{confirmado.profesional}</dd>
          </div>
          {confirmado.sede && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-500">Dónde</dt>
              <dd className="font-medium text-slate-800">{confirmado.sede}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-500">Centro</dt>
            <dd className="font-medium text-slate-800">{centro.nombre}</dd>
          </div>
        </dl>

        <p className="mt-4 text-sm text-slate-600">
          Si no vas a poder venir, avisanos así liberamos el horario para otra persona.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {centro.telefono && (
            <EnviarWhatsApp
              telefono={centro.telefono}
              variante="primario"
              etiqueta="Escribirle al centro"
              mensaje={
                '¡Hola! Soy ' + confirmado.paciente + '. Acabo de reservar un turno para ' +
                formatearFechaLarga(confirmado.fecha) + ' a las ' + hhmm(confirmado.hora) + '.'
              }
            />
          )}
          <button
            type="button"
            onClick={() => {
              setConfirmado(null)
              setHora('')
            }}
            className="boton-secundario boton-chico"
          >
            Sacar otro turno
          </button>
        </div>
      </div>
    )
  }

  return (
    <form action={accion} className="space-y-5">
      {estado.error && (
        <div className="aviso-error" role="alert">
          <IconoAlerta className="size-5 shrink-0" />
          <span>{estado.error}</span>
        </div>
      )}

      {/* --- Con quién y cuándo --- */}
      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-slate-900">1. Elegí el día</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {profesionales.length > 1 && (
            <div>
              <label htmlFor="profesional_id" className="etiqueta">
                Profesional
              </label>
              <select
                id="profesional_id"
                name="profesional_id"
                value={profesionalId}
                onChange={(e) => setProfesionalId(e.target.value)}
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
          )}
          {profesionales.length === 1 && (
            <input type="hidden" name="profesional_id" value={profesionalId} />
          )}

          <div>
            <label htmlFor="fecha" className="etiqueta">
              Fecha
            </label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              value={fecha}
              min={hoy}
              max={sumarDias(hoy, almacen.DIAS_RESERVA_ONLINE)}
              onChange={(e) => e.target.value && setFecha(e.target.value)}
              required
              className="campo"
            />
          </div>

          {sedes.length > 1 ? (
            <div>
              <label htmlFor="sede_id" className="etiqueta">
                Sede
              </label>
              <select
                id="sede_id"
                name="sede_id"
                value={sedeId}
                onChange={(e) => setSedeId(e.target.value)}
                className="campo"
              >
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="sede_id" value={sedeId} />
          )}
        </div>

        {sedes.length === 1 && sedes[0]?.direccion && (
          <p className="ayuda flex items-center gap-1.5">
            <IconoSede className="size-4 text-slate-400" />
            {sedes[0].nombre} — {sedes[0].direccion}
          </p>
        )}
      </section>

      {/* --- Horario --- */}
      <section className="tarjeta p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-900">2. Elegí el horario</h2>
          <p className="text-xs text-slate-500">Sesiones de {centro.duracion_turno_min} minutos</p>
        </div>

        {libres.length === 0 ? (
          <div className="aviso-info">
            <IconoReloj className="size-5 shrink-0" />
            <span>
              No quedan horarios libres para ese día. Probá con otra fecha.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {libres.map((f) => (
              <button
                key={f.inicio}
                type="button"
                onClick={() => setHora(f.inicio)}
                aria-pressed={hora === f.inicio}
                className={
                  'rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums transition-colors ' +
                  (hora === f.inicio
                    ? 'border-marca-600 bg-marca-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-marca-400 hover:bg-marca-50')
                }
              >
                {f.inicio}
              </button>
            ))}
          </div>
        )}

        <input type="hidden" name="hora_inicio" value={hora} />
      </section>

      {/* --- Datos del paciente --- */}
      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-slate-900">3. Tus datos</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="apellido" className="etiqueta">
              Apellido
            </label>
            <input id="apellido" name="apellido" required className="campo" />
          </div>
          <div>
            <label htmlFor="nombre" className="etiqueta">
              Nombre
            </label>
            <input id="nombre" name="nombre" required className="campo" />
          </div>
          <div>
            <label htmlFor="telefono" className="etiqueta">
              Teléfono (WhatsApp)
            </label>
            <input
              id="telefono"
              name="telefono"
              inputMode="tel"
              required
              placeholder="11 5555-1234"
              className="campo"
            />
            <p className="ayuda">Es por donde te vamos a confirmar el turno.</p>
          </div>
          <div>
            <label htmlFor="email" className="etiqueta">
              Email <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input id="email" name="email" type="email" className="campo" />
          </div>
          <div>
            <label htmlFor="dni" className="etiqueta">
              DNI <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input id="dni" name="dni" inputMode="numeric" className="campo" />
          </div>
          <div>
            <label htmlFor="cobertura" className="etiqueta">
              Cobertura
            </label>
            <select
              id="cobertura"
              name="cobertura"
              value={cobertura}
              onChange={(e) => setCobertura(e.target.value as 'particular' | 'obra_social')}
              className="campo"
            >
              <option value="particular">{COBERTURAS.particular}</option>
              <option value="obra_social">{COBERTURAS.obra_social}</option>
            </select>
          </div>
          {cobertura === 'obra_social' && (
            <div className="sm:col-span-2">
              <label htmlFor="obra_social" className="etiqueta">
                Obra social
              </label>
              <input
                id="obra_social"
                name="obra_social"
                required
                placeholder="OSDE, Swiss Medical, IOMA…"
                className="campo"
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label htmlFor="comentario" className="etiqueta">
              ¿Por qué venís? <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="comentario"
              name="comentario"
              rows={3}
              placeholder="Dolor de cintura hace dos semanas, post operatorio de rodilla…"
              className="campo resize-y"
            />
          </div>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-lg border border-linea p-4">
          <input
            type="checkbox"
            name="primera_vez"
            value="si"
            className="mt-0.5 size-4 rounded border-slate-300"
          />
          <span>
            <span className="block font-medium text-slate-800">Es mi primera vez en el centro</span>
            <span className="block text-sm text-slate-500">
              Así preparamos la primera sesión como corresponde.
            </span>
          </span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="boton-primario" disabled={pendiente || !hora}>
          {pendiente ? 'Reservando…' : 'Reservar turno'}
        </button>
        {hora && (
          <p className="text-sm text-slate-500 first-letter:uppercase">
            {formatearFechaLarga(fecha)} a las <strong className="font-semibold text-slate-800">{hora}</strong>
          </p>
        )}
      </div>
    </form>
  )
}
