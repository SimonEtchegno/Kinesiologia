import type { SVGProps } from 'react'

/**
 * Iconografía line, trazo 1.75, sin relleno. Heredan currentColor
 * y el tamaño se controla con clases (className="size-5").
 */
type Props = SVGProps<SVGSVGElement>

function Base({ children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconoAgenda = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M8 3v3M16 3v3M3 9.5h18" />
  </Base>
)

export const IconoPacientes = (p: Props) => (
  <Base {...p}>
    <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
    <circle cx="10" cy="8" r="3.25" />
    <path d="M17.5 11.5a3 3 0 0 0 0-6M20 19v-1.2a3.2 3.2 0 0 0-2.2-3" />
  </Base>
)

export const IconoReportes = (p: Props) => (
  <Base {...p}>
    <path d="M4 20h16" />
    <path d="M7 20v-6M12 20V8M17 20v-9" />
  </Base>
)

export const IconoConfig = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .33 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.33 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.33-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6h.08A1.6 1.6 0 0 0 10 3.13V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v.08a1.6 1.6 0 0 0 1.47.92H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </Base>
)

export const IconoSalir = (p: Props) => (
  <Base {...p}>
    <path d="M15 17l5-5-5-5M20 12H9M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
  </Base>
)

export const IconoMas = (p: Props) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)

export const IconoBuscar = (p: Props) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Base>
)

export const IconoIzquierda = (p: Props) => (
  <Base {...p}>
    <path d="m14 6-6 6 6 6" />
  </Base>
)

export const IconoDerecha = (p: Props) => (
  <Base {...p}>
    <path d="m10 6 6 6-6 6" />
  </Base>
)

export const IconoReloj = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Base>
)

export const IconoCheck = (p: Props) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Base>
)

export const IconoX = (p: Props) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
)

export const IconoAlerta = (p: Props) => (
  <Base {...p}>
    <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
    <path d="M12 10v4M12 17h.01" />
  </Base>
)

export const IconoNota = (p: Props) => (
  <Base {...p}>
    <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L14 3.5Z" />
    <path d="M14 3.5v5h5M8.5 13h7M8.5 16.5h4.5" />
  </Base>
)

export const IconoSede = (p: Props) => (
  <Base {...p}>
    <path d="M12 21s6.5-5.4 6.5-10a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21Z" />
    <circle cx="12" cy="11" r="2.5" />
  </Base>
)

export const IconoUsuario = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20v-1a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1" />
  </Base>
)

export const IconoTelefono = (p: Props) => (
  <Base {...p}>
    <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
  </Base>
)

export const IconoMail = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m3.8 7 8.2 6 8.2-6" />
  </Base>
)

export const IconoEscudo = (p: Props) => (
  <Base {...p}>
    <path d="M12 3 5 5.6v5.9c0 4.3 2.9 8.1 7 9.5 4.1-1.4 7-5.2 7-9.5V5.6L12 3Z" />
    <path d="M12 9v6M9 12h6" />
  </Base>
)

export const IconoLapiz = (p: Props) => (
  <Base {...p}>
    <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5Z" />
    <path d="m13.5 6.5 4 4" />
  </Base>
)

export const IconoDescargar = (p: Props) => (
  <Base {...p}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15" />
  </Base>
)

export const IconoMenu = (p: Props) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
)

export const IconoHistorial = (p: Props) => (
  <Base {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4.5V10h5.5" />
    <path d="M12 8.5V12l2.8 1.8" />
  </Base>
)
