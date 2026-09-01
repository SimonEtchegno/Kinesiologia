'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useState } from 'react'
import { IconoAlerta } from '@/componentes/Iconos'
import { COBERTURAS, type Cobertura, type Paciente } from '@/lib/dominio'
import type { Sesion } from '@/lib/local/sesion'
import { actualizarPaciente, crearPaciente, type Resultado } from './acciones'

/** UC-08 (alta) y edición de datos básicos de UC-07. */
export default function FormularioPaciente({ sesion, paciente }: { sesion: Sesion; paciente?: Paciente }) {
  const esEdicion = Boolean(paciente)
  const router = useRouter()

  const [estado, accion, pendiente] = useActionState<Resultado, FormData>((prev, fd) => {
    const r = esEdicion ? actualizarPaciente(sesion, prev, fd) : crearPaciente(sesion, prev, fd)
    if (r.ok) router.push('/pacientes/' + (paciente?.id ?? r.id))
    return r
  }, {})

  const [cobertura, setCobertura] = useState<Cobertura>(paciente?.cobertura ?? 'particular')

  return (
    <form action={accion} className="space-y-5">
      {paciente && <input type="hidden" name="id" value={paciente.id} />}

      {estado.error && (
        <div className="aviso-error" role="alert">
          <IconoAlerta className="size-5 shrink-0" />
          <span>{estado.error}</span>
        </div>
      )}

      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Datos personales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="apellido" className="etiqueta">
              Apellido
            </label>
            <input
              id="apellido"
              name="apellido"
              required
              autoFocus={!esEdicion}
              defaultValue={paciente?.apellido ?? ''}
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="nombre" className="etiqueta">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              required
              defaultValue={paciente?.nombre ?? ''}
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="dni" className="etiqueta">
              DNI
            </label>
            <input
              id="dni"
              name="dni"
              inputMode="numeric"
              defaultValue={paciente?.dni ?? ''}
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="fecha_nacimiento" className="etiqueta">
              Fecha de nacimiento
            </label>
            <input
              id="fecha_nacimiento"
              name="fecha_nacimiento"
              type="date"
              defaultValue={paciente?.fecha_nacimiento ?? ''}
              className="campo"
            />
          </div>
        </div>
      </section>

      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="telefono" className="etiqueta">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              inputMode="tel"
              placeholder="11 5555-5555"
              defaultValue={paciente?.telefono ?? ''}
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="email" className="etiqueta">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={paciente?.email ?? ''}
              className="campo"
            />
          </div>
        </div>
      </section>

      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Cobertura</h2>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(COBERTURAS) as Cobertura[]).map((c) => (
            <label
              key={c}
              className={
                'cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ' +
                (cobertura === c
                  ? 'border-marca-600 bg-marca-50 text-marca-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')
              }
            >
              <input
                type="radio"
                name="cobertura"
                value={c}
                checked={cobertura === c}
                onChange={() => setCobertura(c)}
                className="sr-only"
              />
              {COBERTURAS[c]}
            </label>
          ))}
        </div>

        {cobertura === 'obra_social' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="obra_social" className="etiqueta">
                Obra social o prepaga
              </label>
              <input
                id="obra_social"
                name="obra_social"
                required
                placeholder="OSDE, Swiss Medical, IOMA…"
                defaultValue={paciente?.obra_social ?? ''}
                className="campo"
              />
            </div>
            <div>
              <label htmlFor="nro_afiliado" className="etiqueta">
                Nº de afiliado
              </label>
              <input
                id="nro_afiliado"
                name="nro_afiliado"
                defaultValue={paciente?.nro_afiliado ?? ''}
                className="campo"
              />
            </div>
          </div>
        )}
      </section>

      <section className="tarjeta p-5">
        <label htmlFor="notas" className="etiqueta">
          Notas administrativas
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          defaultValue={paciente?.notas ?? ''}
          placeholder="Derivación, diagnóstico médico, cantidad de sesiones autorizadas…"
          className="campo resize-y"
        />
        <p className="ayuda">
          Para la evolución de cada sesión usá las observaciones clínicas, no este campo.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="boton-primario" disabled={pendiente}>
          {pendiente ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Dar de alta'}
        </button>
        <Link
          href={paciente ? '/pacientes/' + paciente.id : '/pacientes'}
          className="boton-secundario"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
