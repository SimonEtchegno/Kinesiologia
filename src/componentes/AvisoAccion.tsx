import { IconoAlerta, IconoCheck } from '@/componentes/Iconos'

/** Muestra el error o el ok que devolvió una Server Action. */
export default function AvisoAccion({ error, ok }: { error?: string; ok?: string }) {
  if (error) {
    return (
      <div className="aviso-error mb-4" role="alert">
        <IconoAlerta className="size-5 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }
  if (ok) {
    return (
      <div className="aviso-ok mb-4" role="status">
        <IconoCheck className="size-5 shrink-0" />
        <span>{ok}</span>
      </div>
    )
  }
  return null
}
