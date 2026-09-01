import { asignarCarriles, PX_POR_MIN, posicion } from '@/lib/agenda'
import type { TurnoExpandido } from '@/lib/dominio'
import { desdeISO, desdeMinutos, DIAS_CORTOS } from '@/lib/fechas'
import ChipTurno from './ChipTurno'

interface Props {
  dias: string[]
  turnosPorDia: Map<string, TurnoExpandido[]>
  ventana: { desde: number; hasta: number }
  hoy: string
  mostrarProfesional: boolean
}

export default function GrillaSemana({
  dias,
  turnosPorDia,
  ventana,
  hoy,
  mostrarProfesional,
}: Props) {
  const alto = (ventana.hasta - ventana.desde) * PX_POR_MIN
  const horas: number[] = []
  for (let m = ventana.desde; m <= ventana.hasta; m += 60) horas.push(m)

  return (
    <div className="tarjeta overflow-hidden">
      <div className="overflow-x-auto scroll-fino">
        <div className="min-w-[52rem]">
          {/* Encabezado de días */}
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-linea bg-slate-50/70">
            <div />
            {dias.map((d) => {
              const fecha = desdeISO(d)
              const esHoy = d === hoy
              return (
                <div
                  key={d}
                  className={
                    'border-l border-linea px-2 py-2.5 text-center ' + (esHoy ? 'bg-marca-50' : '')
                  }
                >
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">
                    {DIAS_CORTOS[fecha.getDay()]}
                  </p>
                  <p
                    className={
                      'mt-0.5 text-lg font-semibold tabular-nums ' +
                      (esHoy ? 'text-marca-700' : 'text-slate-800')
                    }
                  >
                    {fecha.getDate()}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Cuerpo */}
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
            {/* Regla horaria */}
            <div className="relative" style={{ height: alto }}>
              {horas.slice(0, -1).map((m) => (
                <span
                  key={m}
                  className="absolute right-2 -translate-y-1/2 text-[0.7rem] font-medium tabular-nums text-slate-400"
                  style={{ top: (m - ventana.desde) * PX_POR_MIN }}
                >
                  {desdeMinutos(m)}
                </span>
              ))}
            </div>

            {dias.map((d) => {
              const colocados = asignarCarriles(turnosPorDia.get(d) ?? [])
              return (
                <div
                  key={d}
                  className="relative border-l border-linea"
                  style={{
                    height: alto,
                    backgroundImage:
                      'repeating-linear-gradient(to bottom, var(--color-linea) 0 1px, transparent 1px ' +
                      60 * PX_POR_MIN +
                      'px)',
                  }}
                >
                  {colocados.map(({ turno, carril, carriles }) => {
                    const { top, alto: altoTurno } = posicion(turno, ventana.desde)
                    const ancho = 100 / carriles
                    return (
                      <div
                        key={turno.id}
                        className="absolute px-0.5"
                        style={{
                          top,
                          height: altoTurno,
                          left: carril * ancho + '%',
                          width: ancho + '%',
                        }}
                      >
                        <ChipTurno turno={turno} mostrarProfesional={mostrarProfesional} />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
