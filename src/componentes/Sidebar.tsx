'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  IconoAgenda,
  IconoConfig,
  IconoEscudo,
  IconoMenu,
  IconoPacientes,
  IconoReportes,
  IconoSalir,
  IconoX,
} from '@/componentes/Iconos'
import BotonTema from '@/componentes/BotonTema'
import { iniciales } from '@/lib/dominio'

interface Props {
  nombre: string
  email: string
  rolEtiqueta: string
  centro: string
  esAdmin: boolean
  /** Server Action de logout. */
  alSalir: () => Promise<void>
}

const ITEMS = [
  { href: '/agenda', etiqueta: 'Agenda', Icono: IconoAgenda, soloAdmin: false },
  { href: '/pacientes', etiqueta: 'Pacientes', Icono: IconoPacientes, soloAdmin: false },
  { href: '/reportes', etiqueta: 'Reportes', Icono: IconoReportes, soloAdmin: true },
  { href: '/configuracion', etiqueta: 'Configuración', Icono: IconoConfig, soloAdmin: false },
]

export default function Sidebar({ nombre, email, rolEtiqueta, centro, esAdmin, alSalir }: Props) {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)

  // Al navegar, cerrar el cajón en mobile. Ajustar estado durante el
  // render (en vez de en un efecto) evita el frame extra de repintado.
  const [rutaPrevia, setRutaPrevia] = useState(pathname)
  if (pathname !== rutaPrevia) {
    setRutaPrevia(pathname)
    setAbierto(false)
  }

  const items = ITEMS.filter((i) => !i.soloAdmin || esAdmin)

  const contenido = (
    <div className="flex h-full flex-col">
      {/* Marca */}
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-marca-600 text-white">
          <IconoEscudo className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight text-slate-900">Kinesio</p>
          <p className="truncate text-xs text-slate-500">{centro}</p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="boton-fantasma boton-chico ml-auto lg:hidden"
          aria-label="Cerrar menú"
        >
          <IconoX className="size-5" />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-2" aria-label="Secciones">
        <ul className="space-y-1">
          {items.map(({ href, etiqueta, Icono }) => {
            const activo = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={activo ? 'page' : undefined}
                  className={
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
                    (activo
                      ? 'bg-marca-50 text-marca-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
                  }
                >
                  <Icono className={'size-5 ' + (activo ? 'text-marca-600' : 'text-slate-400')} />
                  {etiqueta}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Usuario */}
      <div className="border-t border-linea p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-acento-100 text-sm font-semibold text-acento-700">
            {iniciales(nombre)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{nombre}</p>
            <p className="truncate text-xs text-slate-500">{rolEtiqueta}</p>
          </div>
        </div>
        <p className="truncate px-2 pb-2 text-xs text-slate-400">{email}</p>
        <div className="mb-1">
          <BotonTema />
        </div>
        <form action={alSalir}>
          <button type="submit" className="boton-fantasma boton-chico w-full justify-start">
            <IconoSalir className="size-[1.05rem] text-slate-400" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Barra superior solo mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-linea bg-white/90 px-4 py-3 backdrop-blur lg:hidden no-imprimir">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="boton-fantasma boton-chico"
            aria-label="Abrir menú"
          >
            <IconoMenu className="size-5" />
          </button>
          <span className="font-semibold tracking-tight text-slate-900">Kinesio</span>
        </div>
        <BotonTema compacto />
      </header>

      {/* Cajón mobile */}
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-linea bg-white">
            {contenido}
          </aside>
        </div>
      )}

      {/* Sidebar fijo desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-linea bg-white lg:block no-imprimir">
        {contenido}
      </aside>
    </>
  )
}
