import { IconoInfo } from '@/componentes/Iconos'
import { ESTADOS, tipoSesionDe, type EstadoTurno, type TurnoExpandido } from '@/lib/dominio'

const ESTADOS_LEYENDA: EstadoTurno[] = ['confirmado', 'reprogramado', 'realizado', 'ausente']

/** Qué significa cada color de la agenda. Solo lista los tipos que están a la vista. */
export default function LeyendaTipos({ turnos }: { turnos: TurnoExpandido[] }) {
  const vistos = new Map<string, ReturnType<typeof tipoSesionDe>>()
  for (const t of turnos) {
    if (!vistos.has(t.tipo_sesion)) vistos.set(t.tipo_sesion, tipoSesionDe(t.tipo_sesion))
  }
  if (vistos.size === 0) return null

  return (
    <div className="tarjeta-sombra mt-7 p-3.5 sm:p-4 text-xs no-imprimir">
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        {/* Tipos de sesión activos */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <IconoInfo className="size-3.5" />
            Sesiones:
          </span>
          {[...vistos.values()].map((tipo) => (
            <span
              key={tipo.valor}
              className="inline-flex items-center gap-1.5 rounded-lg border border-linea bg-slate-50/80 px-2.5 py-1 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
            >
              <span className={'size-2 rounded-full ' + tipo.punto} />
              <span className="font-medium">{tipo.etiqueta}</span>
            </span>
          ))}
        </div>

        {/* Estados */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Estados:
          </span>
          {ESTADOS_LEYENDA.map((e) => (
            <span
              key={e}
              className="inline-flex items-center gap-1.5 rounded-lg border border-linea bg-slate-50/80 px-2.5 py-1 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
            >
              <span className={'size-2 rounded-full ' + ESTADOS[e].punto} />
              <span className="font-medium">{ESTADOS[e].etiqueta}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
