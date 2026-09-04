'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { IconoSpinner } from './Iconos'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'disabled' | 'type'> {
  children: ReactNode
  /** Qué mostrar mientras la acción está en curso. Por defecto, lo mismo con un spinner al lado. */
  cargando?: ReactNode
  disabled?: boolean
}

/**
 * Botón de submit con spinner mientras el <form> que lo contiene está
 * enviando su acción — useFormStatus lee ese estado del form más cercano,
 * así que este componente tiene que ir DENTRO del <form>, no al lado.
 * Funciona igual con Server Actions llamadas directo o vía useActionState.
 */
export default function BotonEnviar({ children, cargando, disabled, ...props }: Props) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <IconoSpinner className="size-4 animate-spin" />
          {cargando}
        </>
      ) : (
        children
      )}
    </button>
  )
}
