import { redirect } from 'next/navigation'
import { FormClave } from '@/app/(panel)/configuracion/FormulariosConfig'
import { IconoEscudo } from '@/componentes/Iconos'
import { alSalir } from '@/lib/accionesAuth'
import { exigirSesion } from '@/lib/sesion'

/**
 * Primer ingreso de una cuenta creada por el administrador (UC-10).
 * Vive fuera del layout del panel para no chocar con su redirección.
 */
export default async function PaginaCambiarClave() {
  const sesion = await exigirSesion()
  if (!sesion.perfil.debe_cambiar_password) redirect('/agenda')

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

          <FormClave primeraVez />
        </div>

        <form action={alSalir} className="mt-5">
          <button type="submit" className="block w-full text-center text-sm text-slate-500 hover:underline">
            Salir
          </button>
        </form>
      </div>
    </main>
  )
}
