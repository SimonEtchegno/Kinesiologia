'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import AvisoAccion from '@/componentes/AvisoAccion'
import { IconoCheck } from '@/componentes/Iconos'
import { crearProfesional } from '../acciones'

/** UC-10 — Dar de alta un kinesiólogo nuevo. */
export default function FormProfesional() {
  const [estado, accion, pendiente] = useActionState(crearProfesional, {})

  // Cuenta creada: mostramos la clave temporal una sola vez.
  if (estado.claveTemporal) {
    return (
      <div className="tarjeta p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-acento-100 text-acento-700">
            <IconoCheck />
          </span>
          <div>
            <p className="font-semibold text-slate-900">{estado.ok}</p>
            <p className="text-sm text-slate-500">Ya tiene su agenda, vacía y lista.</p>
          </div>
        </div>

        <div className="rounded-lg border border-marca-200 bg-marca-50 p-4">
          <p className="rotulo-seccion">Contraseña temporal</p>
          <p className="mt-2 font-mono text-lg font-semibold tracking-tight text-marca-900 select-all">
            {estado.claveTemporal}
          </p>
          <p className="mt-3 text-sm text-marca-800">
            Pasásela por el canal que uses habitualmente. Se la va a pedir cambiar la primera vez
            que entre. No la vamos a volver a mostrar.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/configuracion/profesionales" className="boton-primario">
            Ver el equipo
          </Link>
          <Link href="/configuracion/profesionales/nuevo" className="boton-secundario">
            Dar de alta otro
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={accion} className="tarjeta p-5">
      <AvisoAccion error={estado.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nombre" className="etiqueta">
            Nombre y apellido
          </label>
          <input id="nombre" name="nombre" required autoFocus className="campo" />
        </div>

        <div>
          <label htmlFor="email" className="etiqueta">
            Email
          </label>
          <input id="email" name="email" type="email" required className="campo" />
          <p className="ayuda">Va a ser su usuario para entrar.</p>
        </div>

        <div>
          <label htmlFor="telefono" className="etiqueta">
            Teléfono
          </label>
          <input id="telefono" name="telefono" inputMode="tel" className="campo" />
        </div>

        <div>
          <label htmlFor="especialidad" className="etiqueta">
            Especialidad
          </label>
          <input
            id="especialidad"
            name="especialidad"
            placeholder="Kinesiología deportiva, respiratoria…"
            className="campo"
          />
        </div>

        <div>
          <label htmlFor="rol" className="etiqueta">
            Rol
          </label>
          <select id="rol" name="rol" className="campo" defaultValue="kinesiologo">
            <option value="kinesiologo">Kinesiólogo/a</option>
            <option value="admin">Administrador</option>
          </select>
          <p className="ayuda">El administrador ve la agenda y los reportes de todo el centro.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className="boton-primario" disabled={pendiente}>
          {pendiente ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
        <Link href="/configuracion/profesionales" className="boton-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
