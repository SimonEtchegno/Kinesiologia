'use client'

import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import AvisoAccion from '@/componentes/AvisoAccion'
import type { Centro, Perfil } from '@/lib/dominio'
import { useSesion, type Sesion } from '@/lib/local/sesion'
import {
  actualizarCentro,
  actualizarMisDatos,
  cambiarClave,
  type Resultado,
} from './acciones'

// ------------------------------------------------------------
// Mis datos
// ------------------------------------------------------------
export function FormMisDatos({ sesion, perfil }: { sesion: Sesion; perfil: Perfil }) {
  const { refrescar } = useSesion()
  const [estado, accion, pendiente] = useActionState<Resultado, FormData>((prev, fd) => {
    const r = actualizarMisDatos(sesion, prev, fd)
    if (r.ok) refrescar()
    return r
  }, {})

  return (
    <form action={accion}>
      <AvisoAccion error={estado.error} ok={estado.ok} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="mis_nombre" className="etiqueta">
            Nombre y apellido
          </label>
          <input
            id="mis_nombre"
            name="nombre"
            required
            defaultValue={perfil.nombre}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="mis_especialidad" className="etiqueta">
            Especialidad
          </label>
          <input
            id="mis_especialidad"
            name="especialidad"
            placeholder="Kinesiología deportiva, respiratoria…"
            defaultValue={perfil.especialidad ?? ''}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="mis_telefono" className="etiqueta">
            Teléfono
          </label>
          <input
            id="mis_telefono"
            name="telefono"
            inputMode="tel"
            defaultValue={perfil.telefono ?? ''}
            className="campo"
          />
        </div>
        <div className="sm:col-span-2">
          <span className="etiqueta">Email</span>
          <p className="text-sm text-slate-500">
            {perfil.email} — es tu usuario para entrar, no se cambia desde acá.
          </p>
        </div>
      </div>

      <button type="submit" className="boton-primario mt-5" disabled={pendiente}>
        {pendiente ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}

// ------------------------------------------------------------
// Contraseña
// ------------------------------------------------------------
export function FormClave({ sesion, primeraVez = false }: { sesion: Sesion; primeraVez?: boolean }) {
  const { refrescar } = useSesion()
  const router = useRouter()

  const [estado, accion, pendiente] = useActionState<Resultado, FormData>((prev, fd) => {
    const r = cambiarClave(sesion, prev, fd)
    if (r.ok) {
      refrescar()
      if (primeraVez) router.replace('/agenda')
    }
    return r
  }, {})

  return (
    <form action={accion}>
      <AvisoAccion error={estado.error} ok={estado.ok} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nueva" className="etiqueta">
            Contraseña nueva
          </label>
          <input
            id="nueva"
            name="nueva"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus={primeraVez}
            className="campo"
          />
          <p className="ayuda">Mínimo 8 caracteres.</p>
        </div>
        <div>
          <label htmlFor="repetir" className="etiqueta">
            Repetila
          </label>
          <input
            id="repetir"
            name="repetir"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="campo"
          />
        </div>
      </div>

      <button type="submit" className="boton-primario mt-5" disabled={pendiente}>
        {pendiente ? 'Guardando…' : primeraVez ? 'Guardar y entrar' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}

// ------------------------------------------------------------
// Centro (solo admin)
// ------------------------------------------------------------
export function FormCentro({ sesion, centro }: { sesion: Sesion; centro: Centro }) {
  const { refrescar } = useSesion()
  const [estado, accion, pendiente] = useActionState<Resultado, FormData>((prev, fd) => {
    const r = actualizarCentro(sesion, prev, fd)
    if (r.ok) refrescar()
    return r
  }, {})

  return (
    <form action={accion}>
      <AvisoAccion error={estado.error} ok={estado.ok} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="centro_nombre" className="etiqueta">
            Nombre del centro
          </label>
          <input
            id="centro_nombre"
            name="nombre"
            required
            defaultValue={centro.nombre}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="duracion" className="etiqueta">
            Duración de una sesión
          </label>
          <div className="flex items-center gap-2">
            <input
              id="duracion"
              name="duracion_turno_min"
              type="number"
              min={10}
              max={240}
              step={5}
              required
              defaultValue={centro.duracion_turno_min}
              className="campo w-28"
            />
            <span className="text-sm text-slate-500">minutos</span>
          </div>
          <p className="ayuda">Es la grilla que se ofrece al cargar un turno.</p>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-lg border border-linea p-4">
        <input
          type="checkbox"
          name="kinesiologos_pueden_crear_turnos"
          value="si"
          defaultChecked={centro.kinesiologos_pueden_crear_turnos}
          className="mt-0.5 size-4 rounded border-slate-300"
        />
        <span>
          <span className="block font-medium text-slate-800">
            Los kinesiólogos pueden cargar sus propios turnos
          </span>
          <span className="block text-sm text-slate-500">
            Si lo desactivás, los turnos los carga únicamente el administrador.
          </span>
        </span>
      </label>

      <button type="submit" className="boton-primario mt-5" disabled={pendiente}>
        {pendiente ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
