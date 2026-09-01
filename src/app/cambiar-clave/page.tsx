'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FormClave } from '@/app/(panel)/configuracion/FormulariosConfig'
import { IconoEscudo } from '@/componentes/Iconos'
import { cerrarSesion } from '@/lib/local/almacen'
import { useSesion } from '@/lib/local/sesion'

/**
 * Primer ingreso de una cuenta creada por el administrador (UC-10).
 * Vive fuera del layout del panel para no chocar con su redirección.
 */
export default function PaginaCambiarClave() {
  const { sesion, refrescar } = useSesion()
  const router = useRouter()

  useEffect(() => {
    if (sesion === null) router.replace('/login')
    else if (sesion && !sesion.perfil.debe_cambiar_password) router.replace('/agenda')
  }, [sesion, router])

  function alSalir() {
    cerrarSesion()
    refrescar()
    router.replace('/login')
  }

  if (!sesion || !sesion.perfil.debe_cambiar_password) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-marca-200 border-t-marca-600" />
      </div>
    )
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-marca-50 via-lienzo to-acento-50/60 px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-marca-600 text-white">
            <IconoEscudo className="size-5" />
          </span>
          <div>
            <p className="font-semibold tracking-tight text-slate-900">Kinesio</p>
            <p className="text-xs text-slate-500">{sesion.centro.nombre}</p>
          </div>
        </div>

        <div className="tarjeta-sombra p-7">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Bienvenido/a, {sesion.perfil.nombre.split(' ')[0]}
          </h1>
          <p className="subtitulo mt-1 mb-6">
            Entraste con una contraseña temporal. Elegí una propia para seguir.
          </p>

          <FormClave sesion={sesion} primeraVez />
        </div>

        <button type="button" onClick={alSalir} className="mt-5 block w-full text-center text-sm text-slate-500 hover:underline">
          Salir
        </button>
      </div>
    </main>
  )
}
