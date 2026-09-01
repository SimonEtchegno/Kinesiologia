'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSesion, type Sesion } from './sesion'

/**
 * Envuelve una página del panel: si todavía no se leyó localStorage muestra
 * un esqueleto; si no hay sesión, redirige a /login (UC-01); si `soloAdmin`
 * y el usuario no es administrador, redirige a /agenda.
 */
export default function Protegido({
  soloAdmin = false,
  children,
}: {
  soloAdmin?: boolean
  children: (sesion: Sesion) => React.ReactNode
}) {
  const { sesion } = useSesion()
  const router = useRouter()

  useEffect(() => {
    if (sesion === null) router.replace('/login')
    else if (sesion && soloAdmin && !sesion.esAdmin) router.replace('/agenda')
    else if (sesion && sesion.perfil.debe_cambiar_password) router.replace('/cambiar-clave')
  }, [sesion, soloAdmin, router])

  if (!sesion || (soloAdmin && !sesion.esAdmin) || sesion.perfil.debe_cambiar_password) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-marca-200 border-t-marca-600" />
      </div>
    )
  }

  return <>{children(sesion)}</>
}
