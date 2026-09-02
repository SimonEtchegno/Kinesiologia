'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { IconoAlerta } from '@/componentes/Iconos'
import BotonGoogle from '@/componentes/BotonGoogle'
import { clienteNavegador } from '@/lib/supabase/navegador'
import { mensajeDeError } from '@/lib/supabase/mensajes'

interface EstadoLogin {
  error?: string
}

export default function FormularioLogin({
  volver,
  errorInicial,
}: {
  volver: string
  errorInicial?: string
}) {
  const router = useRouter()

  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(async (_prev, fd) => {
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    if (!email || !password) return { error: 'Ingresá tu email y tu contraseña.' }

    const supabase = clienteNavegador()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: mensajeDeError(error) }

    router.replace(volver)
    router.refresh()
    return {}
  }, errorInicial ? { error: errorInicial } : {})

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
          <label htmlFor="email" className="etiqueta">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="vos@centro.com.ar"
            className="campo"
          />
        </div>

        <div>
          <label htmlFor="password" className="etiqueta">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="campo"
          />
        </div>

        <button type="submit" className="boton-primario w-full py-3" disabled={pendiente}>
          {pendiente ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-linea" />
        O
        <span className="h-px flex-1 bg-linea" />
      </div>

      <BotonGoogle volver={volver} />

      <p className="text-center text-sm text-slate-500">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="font-medium text-marca-700 hover:underline">
          Creá una
        </Link>{' '}
        — quedás como administrador del centro.
      </p>
    </div>
  )
}
