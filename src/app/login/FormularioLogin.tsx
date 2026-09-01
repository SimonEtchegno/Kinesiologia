'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef } from 'react'
import { IconoAlerta } from '@/componentes/Iconos'
import { useSesion } from '@/lib/local/sesion'
import { ingresar, type EstadoLogin } from './acciones'

export default function FormularioLogin({ volver }: { volver: string }) {
  const { refrescar, sesion } = useSesion()
  const router = useRouter()
  const yaRedirigido = useRef(false)

  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>((prev, fd) => {
    const resultado = ingresar(prev, fd)
    if (!resultado.error) refrescar()
    return resultado
  }, {})

  useEffect(() => {
    // Login exitoso: refrescar() ya leyó la nueva sesión de localStorage.
    if (sesion && !yaRedirigido.current) {
      yaRedirigido.current = true
      router.replace(volver)
    }
  }, [sesion, volver, router])

  return (
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

      <p className="text-center text-xs text-slate-500">
        ¿No tenés cuenta? Te la crea el administrador de tu centro.
      </p>
    </form>
  )
}
