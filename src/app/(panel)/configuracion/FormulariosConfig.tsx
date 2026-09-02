'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import AvisoAccion from '@/componentes/AvisoAccion'
import { IconoCheck, IconoLink, IconoWhatsApp } from '@/componentes/Iconos'
import type { Centro, Perfil } from '@/lib/dominio'
import {
  actualizarCentro,
  actualizarMisDatos,
  actualizarReservas,
  actualizarWhatsapp,
  cambiarClave,
} from './acciones'

// ------------------------------------------------------------
// Mis datos
// ------------------------------------------------------------
export function FormMisDatos({ perfil }: { perfil: Perfil }) {
  const [estado, accion, pendiente] = useActionState(actualizarMisDatos, {})

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
export function FormClave({ primeraVez = false }: { primeraVez?: boolean }) {
  const router = useRouter()

  const [estado, accion, pendiente] = useActionState(async (prev: Awaited<ReturnType<typeof cambiarClave>>, fd: FormData) => {
    const r = await cambiarClave(prev, fd)
    if (r.ok && primeraVez) {
      router.replace('/agenda')
      router.refresh()
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
export function FormCentro({ centro }: { centro: Centro }) {
  const [estado, accion, pendiente] = useActionState(actualizarCentro, {})

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
          <label htmlFor="centro_telefono" className="etiqueta">
            Teléfono / WhatsApp del centro
          </label>
          <input
            id="centro_telefono"
            name="telefono"
            inputMode="tel"
            placeholder="11 5555-1234"
            defaultValue={centro.telefono ?? ''}
            className="campo"
          />
          <p className="ayuda">Es el que ven los pacientes para escribirte.</p>
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

// ------------------------------------------------------------
// Turnos online (solo admin)
// ------------------------------------------------------------
export function FormReservas({ centro }: { centro: Centro }) {
  const [estado, accion, pendiente] = useActionState(actualizarReservas, {})

  const [link, setLink] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    setLink(window.location.origin + '/reservar?c=' + centro.id)
  }, [centro.id])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Sin permiso de portapapeles: queda el link a la vista para copiar a mano.
    }
  }

  return (
    <form action={accion}>
      <AvisoAccion error={estado.error} ok={estado.ok} />

      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-lg border border-linea p-4 has-checked:border-marca-400 has-checked:bg-marca-50/50">
          <input
            type="radio"
            name="reservas"
            value="no"
            defaultChecked={!centro.reservas_publicas}
            className="mt-0.5 size-4 border-slate-300"
          />
          <span>
            <span className="block font-medium text-slate-800">
              Los turnos los cargo yo
            </span>
            <span className="block text-sm text-slate-500">
              La página pública queda cerrada: en la agenda solo aparecen los turnos que cargás
              vos (o los profesionales del centro).
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-linea p-4 has-checked:border-marca-400 has-checked:bg-marca-50/50">
          <input
            type="radio"
            name="reservas"
            value="si"
            defaultChecked={centro.reservas_publicas}
            className="mt-0.5 size-4 border-slate-300"
          />
          <span>
            <span className="block font-medium text-slate-800">
              Los pacientes pueden sacar turno online
            </span>
            <span className="block text-sm text-slate-500">
              Se habilita una página sin usuario ni contraseña donde eligen día y horario entre
              los que tenés libres. El turno entra directo en tu agenda, marcado como
              &laquo;online&raquo;.
            </span>
          </span>
        </label>
      </div>

      <button type="submit" className="boton-primario mt-5" disabled={pendiente}>
        {pendiente ? 'Guardando…' : 'Guardar'}
      </button>

      {centro.reservas_publicas && (
        <div className="mt-5 rounded-lg border border-linea bg-slate-50/70 p-4">
          <p className="flex items-center gap-2 font-medium text-slate-800">
            <IconoLink className="size-[1.1rem] text-slate-400" />
            El link para tus pacientes
          </p>
          <p className="mt-2 break-all rounded-md border border-linea bg-white px-3 py-2 font-mono text-xs text-slate-700">
            {link}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copiar} className="boton-secundario boton-chico">
              {copiado ? <IconoCheck className="size-4" /> : null}
              {copiado ? 'Copiado' : 'Copiar link'}
            </button>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="boton-fantasma boton-chico"
            >
              Ver la página
            </a>
          </div>
          <p className="ayuda">
            Pegalo en tu Instagram, en tu WhatsApp o donde te escriban tus pacientes.
          </p>
        </div>
      )}
    </form>
  )
}

// ------------------------------------------------------------
// WhatsApp (solo admin)
// ------------------------------------------------------------
export function FormWhatsapp({ centro }: { centro: Centro }) {
  const [estado, accion, pendiente] = useActionState(actualizarWhatsapp, {})

  return (
    <form action={accion}>
      <AvisoAccion error={estado.error} ok={estado.ok} />

      <label className="flex items-start gap-3 rounded-lg border border-linea p-4">
        <input
          type="checkbox"
          name="whatsapp_ingreso"
          value="si"
          defaultChecked={centro.whatsapp_ingreso_automatico}
          className="mt-0.5 size-4 rounded border-slate-300"
        />
        <span>
          <span className="block font-medium text-slate-800">
            Al cargar un ingreso, preparar el WhatsApp de bienvenida
          </span>
          <span className="block text-sm text-slate-500">
            Apenas guardás un turno de tipo Ingreso, se abre WhatsApp con el mensaje escrito
            (fecha, hora, profesional y qué llevar). Vos lo revisás y lo mandás.
          </span>
        </span>
      </label>

      <p className="ayuda flex items-start gap-2">
        <IconoWhatsApp className="mt-0.5 size-4 shrink-0 text-acento-600" />
        En cualquier turno y en la ficha de cada paciente vas a tener el botón de WhatsApp,
        sea ingreso o no.
      </p>

      <button type="submit" className="boton-primario mt-5" disabled={pendiente}>
        {pendiente ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}
