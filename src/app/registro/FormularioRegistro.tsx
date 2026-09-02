'use client'

import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { IconoAlerta, IconoCheck } from '@/componentes/Iconos'
import BotonGoogle from '@/componentes/BotonGoogle'
import { clienteNavegador } from '@/lib/supabase/navegador'
import { mensajeDeError } from '@/lib/supabase/mensajes'

interface EstadoRegistro {
  error?: string
  /** true = la cuenta se creó pero hay que confirmar el email antes de entrar. */
  confirmarEmail?: boolean
}

export default function FormularioRegistro() {
  const router = useRouter()

  const [estado, accion, pendiente] = useActionState<EstadoRegistro, FormData>(async (_prev, fd) => {
    const nombre = String(fd.get('nombre') ?? '').trim()
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    const repetir = String(fd.get('repetir') ?? '')

    if (!nombre || !email || !password) return { error: 'Completá todos los campos.' }
    if (password !== repetir) return { error: 'Las dos contraseñas no coinciden.' }

    const supabase = clienteNavegador()
    // El nombre viaja en raw_user_meta_data: el trigger de la base lo usa
    // para nombrar el perfil (nunca centro_id/rol — eso solo lo puede
    // fijar una invitación con la service role key, ver UC-10).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    })
    if (error) return { error: mensajeDeError(error) }

    // Con confirmación de email activada, signUp no abre sesión todavía.
    if (!data.session) return { confirmarEmail: true }

    router.replace('/agenda')
    router.refresh()
    return {}
  }, {})

  if (estado.confirmarEmail) {
    return (
      <div className="rounded-lg border border-acento-200 bg-acento-50/60 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-acento-100 text-acento-700">
            <IconoCheck className="size-5" />
          </span>
          <p className="font-semibold text-slate-900">Ya casi — revisá tu email</p>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Te mandamos un link para confirmar la cuenta (mirá también en spam). Apenas lo
          confirmes, entrás con tu email y tu contraseña.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <form action={accion} className="space-y-5" noValidate>
        {estado.error && (
          <div className="aviso-error" role="alert">
            <IconoAlerta className="size-5 shrink-0" />
            <span>{estado.error}</span>
          </div>
        )}

        <div>
          <label htmlFor="nombre" className="etiqueta">
            Nombre y apellido
          </label>
          <input
            id="nombre"
            name="nombre"
            autoComplete="name"
            required
            autoFocus
            placeholder="Valentina Correa"
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
            autoComplete="email"
            required
            placeholder="vos@centro.com.ar"
            className="campo"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="etiqueta">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="campo"
            />
          </div>

          <div>
            <label htmlFor="repetir" className="etiqueta">
              Repetir contraseña
            </label>
            <input
              id="repetir"
              name="repetir"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="••••••••"
              className="campo"
            />
          </div>
        </div>

        <button type="submit" className="boton-primario w-full py-3" disabled={pendiente}>
          {pendiente ? 'Creando la cuenta…' : 'Crear cuenta y entrar'}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-linea" />
        O
        <span className="h-px flex-1 bg-linea" />
      </div>

      <BotonGoogle volver="/agenda" />
    </div>
  )
}
