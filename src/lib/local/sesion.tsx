'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Centro, Perfil } from '@/lib/dominio'
import { centroDe, obtenerSesionActual } from './almacen'

export interface Sesion {
  perfil: Perfil
  centro: Centro
  esAdmin: boolean
  puedeCargarTurnos: boolean
}

interface ContextoSesion {
  /** undefined = todavía no se leyó localStorage (primer render en el servidor). */
  sesion: Sesion | null | undefined
  refrescar: () => void
}

const Contexto = createContext<ContextoSesion | null>(null)

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined)

  const refrescar = useCallback(() => {
    const perfil = obtenerSesionActual()
    if (!perfil) {
      setSesion(null)
      return
    }
    const centro = centroDe(perfil.centro_id)
    if (!centro) {
      setSesion(null)
      return
    }
    setSesion({
      perfil,
      centro,
      esAdmin: perfil.rol === 'admin',
      puedeCargarTurnos: perfil.rol === 'admin' || centro.kinesiologos_pueden_crear_turnos,
    })
  }, [])

  useEffect(() => {
    refrescar()
  }, [refrescar])

  const valor = useMemo(() => ({ sesion, refrescar }), [sesion, refrescar])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

/** undefined = cargando, null = sin sesión, Sesion = logueado. */
export function useSesion() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useSesion tiene que usarse dentro de <SesionProvider>.')
  return ctx
}
