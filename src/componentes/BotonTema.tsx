'use client'

import { useEffect, useState } from 'react'
import { IconoLuna, IconoSol } from '@/componentes/Iconos'

export default function BotonTema({ compacto = false }: { compacto?: boolean }) {
  const [esOscuro, setEsOscuro] = useState(false)
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
    const temaGuardado = localStorage.getItem('tema')
    const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches
    const oscuro = temaGuardado === 'dark' || (!temaGuardado && prefiereOscuro)
    setEsOscuro(oscuro)
    if (oscuro) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  function alternar() {
    const nuevo = !esOscuro
    setEsOscuro(nuevo)
    if (nuevo) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('tema', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('tema', 'light')
    }
  }

  if (!montado) {
    return <div className={compacto ? 'size-9' : 'h-8 w-full'} aria-hidden="true" />
  }

  if (compacto) {
    return (
      <button
        type="button"
        onClick={alternar}
        className="boton-fantasma boton-chico grid size-9 place-items-center rounded-lg p-0"
        title={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {esOscuro ? (
          <IconoSol className="size-4 text-amber-400" />
        ) : (
          <IconoLuna className="size-4 text-slate-500" />
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="boton-fantasma boton-chico w-full justify-start gap-2.5 text-slate-600 hover:text-slate-900"
    >
      {esOscuro ? (
        <>
          <IconoSol className="size-[1.05rem] text-amber-400" />
          <span>Modo claro</span>
        </>
      ) : (
        <>
          <IconoLuna className="size-[1.05rem] text-slate-400" />
          <span>Modo oscuro</span>
        </>
      )}
    </button>
  )
}
