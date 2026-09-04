'use client'

import { useState } from 'react'
import { IconoAlerta, IconoSpinner } from '@/componentes/Iconos'
import { clienteNavegador } from '@/lib/supabase/navegador'
import { mensajeDeError } from '@/lib/supabase/mensajes'

/**
 * Ingreso con Google (UC-01). Manda al usuario a la pantalla de
 * consentimiento de Google; cuando vuelve, `/auth/callback` cambia el
 * código por una sesión y lo deja en la agenda.
 *
 * La cuenta se crea sola la primera vez: el trigger `on_auth_user_created`
 * de la base le arma su centro y lo deja como administrador.
 */
export default function BotonGoogle({ volver = '/agenda' }: { volver?: string }) {
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function entrar() {
    setPendiente(true)
    setError(null)

    const supabase = clienteNavegador()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          window.location.origin + '/auth/callback?volver=' + encodeURIComponent(volver),
        queryParams: { prompt: 'select_account' },
      },
    })

    // Si sale bien, el navegador ya se está yendo a Google y no volvemos acá.
    if (error) {
      setError(mensajeDeError(error))
      setPendiente(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="aviso-error mb-4" role="alert">
          <IconoAlerta className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={entrar}
        disabled={pendiente}
        className="boton-secundario w-full py-3"
      >
        {pendiente ? (
          <IconoSpinner className="size-[1.15rem] animate-spin" />
        ) : (
          // El logo va con sus colores de marca: Google pide no recolorearlo.
          <svg viewBox="0 0 18 18" className="size-[1.15rem]" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
            />
          </svg>
        )}
        {pendiente ? 'Abriendo Google…' : 'Continuar con Google'}
      </button>
    </div>
  )
}
