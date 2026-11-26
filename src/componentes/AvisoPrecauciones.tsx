import { IconoAlerta } from '@/componentes/Iconos'

/**
 * Precauciones clínicas del paciente (marcapasos, oncológico, embarazo…),
 * destacadas para que se vean antes de atender. No muestra nada si no hay.
 */
export default function AvisoPrecauciones({
  precauciones,
  className = '',
}: {
  precauciones: string | null | undefined
  className?: string
}) {
  const texto = precauciones?.trim()
  if (!texto) return null

  return (
    <div className={'aviso-alerta ' + className} role="note">
      <IconoAlerta className="size-5 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">Precauciones</p>
        <p className="mt-0.5 whitespace-pre-line break-words">{texto}</p>
      </div>
    </div>
  )
}
