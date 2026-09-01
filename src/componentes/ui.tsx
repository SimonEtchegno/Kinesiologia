import type { ComponentType, ReactNode, SVGProps } from 'react'
import { ESTADOS, type EstadoTurno } from '@/lib/dominio'

/** Encabezado de pantalla: título, bajada y acciones a la derecha. */
export function Encabezado({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string
  descripcion?: ReactNode
  acciones?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="titulo-pagina">{titulo}</h1>
        {descripcion && <p className="subtitulo mt-1">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2 no-imprimir">{acciones}</div>}
    </div>
  )
}

export function ChipEstado({ estado }: { estado: EstadoTurno }) {
  const { etiqueta, chip, punto } = ESTADOS[estado]
  return (
    <span className={'chip ' + chip}>
      <span className={'size-1.5 rounded-full ' + punto} />
      {etiqueta}
    </span>
  )
}

/** Estado vacío: explica qué falta y ofrece la acción para salir de ahí. */
export function Vacio({
  Icono,
  titulo,
  texto,
  accion,
}: {
  Icono: ComponentType<SVGProps<SVGSVGElement>>
  titulo: string
  texto: string
  accion?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-xl2 bg-marca-50 text-marca-500">
        <Icono className="size-6" />
      </span>
      <p className="mt-4 font-semibold text-slate-800">{titulo}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{texto}</p>
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}

/** Tarjeta de métrica para los reportes (UC-12). */
export function Metrica({
  etiqueta,
  valor,
  detalle,
  tono = 'neutro',
}: {
  etiqueta: string
  valor: string | number
  detalle?: string
  tono?: 'neutro' | 'bien' | 'alerta'
}) {
  const color =
    tono === 'bien' ? 'text-acento-700' : tono === 'alerta' ? 'text-rose-600' : 'text-slate-900'
  return (
    <div className="tarjeta p-5">
      <p className="rotulo-seccion">{etiqueta}</p>
      <p className={'mt-2 text-3xl font-semibold tracking-tight ' + color}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  )
}

/** Fila etiqueta/valor para fichas. */
export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="rotulo-seccion">{etiqueta}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children ?? '—'}</dd>
    </div>
  )
}
