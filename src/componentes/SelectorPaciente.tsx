'use client'

import { useMemo, useState } from 'react'
import { IconoBuscar, IconoCheck, IconoMas, IconoX } from '@/componentes/Iconos'
import { COBERTURAS, type Paciente } from '@/lib/dominio'

/**
 * Buscador de pacientes con opción de alta en el mismo paso
 * (precondición de UC-03). Guarda el id elegido en un input oculto.
 */
export default function SelectorPaciente({
  pacientes,
  nombre = 'paciente_id',
  inicial,
  onCambio,
}: {
  pacientes: Paciente[]
  nombre?: string
  inicial?: string
  /** Avisa qué paciente quedó elegido ('__nuevo' si se da de alta acá). */
  onCambio?: (pacienteId: string) => void
}) {
  const [elegido, setElegido] = useState<string>(inicial ?? '')
  const [texto, setTexto] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const [cobertura, setCobertura] = useState<'particular' | 'obra_social'>('particular')

  const seleccionado = pacientes.find((p) => p.id === elegido)

  function elegir(id: string) {
    setElegido(id)
    onCambio?.(id)
  }

  const filtrados = useMemo(() => {
    const t = texto.trim().toLowerCase()
    const lista = t
      ? pacientes.filter((p) =>
          (p.apellido + ' ' + p.nombre + ' ' + (p.dni ?? '')).toLowerCase().includes(t),
        )
      : pacientes
    return lista.slice(0, 8)
  }, [pacientes, texto])

  if (nuevo) {
    return (
      <div className="rounded-lg border border-marca-200 bg-marca-50/50 p-4">
        <input type="hidden" name={nombre} value="__nuevo" />

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Paciente nuevo</p>
          <button
            type="button"
            onClick={() => {
              setNuevo(false)
              onCambio?.(elegido)
            }}
            className="boton-fantasma boton-chico"
          >
            <IconoX className="size-4" />
            Elegir uno existente
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="nuevo_apellido" className="etiqueta">
              Apellido
            </label>
            <input id="nuevo_apellido" name="nuevo_apellido" required className="campo" />
          </div>
          <div>
            <label htmlFor="nuevo_nombre" className="etiqueta">
              Nombre
            </label>
            <input id="nuevo_nombre" name="nuevo_nombre" required className="campo" />
          </div>
          <div>
            <label htmlFor="nuevo_telefono" className="etiqueta">
              Teléfono
            </label>
            <input id="nuevo_telefono" name="nuevo_telefono" inputMode="tel" className="campo" />
          </div>
          <div>
            <label htmlFor="nuevo_cobertura" className="etiqueta">
              Cobertura
            </label>
            <select
              id="nuevo_cobertura"
              name="nuevo_cobertura"
              value={cobertura}
              onChange={(e) => setCobertura(e.target.value as 'particular' | 'obra_social')}
              className="campo"
            >
              <option value="particular">{COBERTURAS.particular}</option>
              <option value="obra_social">{COBERTURAS.obra_social}</option>
            </select>
          </div>
          {cobertura === 'obra_social' && (
            <div className="sm:col-span-2">
              <label htmlFor="nuevo_obra_social" className="etiqueta">
                Obra social
              </label>
              <input
                id="nuevo_obra_social"
                name="nuevo_obra_social"
                required
                placeholder="OSDE, Swiss Medical, IOMA…"
                className="campo"
              />
            </div>
          )}
        </div>

        <p className="ayuda">Después vas a poder completar el resto de la ficha.</p>
      </div>
    )
  }

  return (
    <div>
      <input type="hidden" name={nombre} value={elegido} />

      {seleccionado ? (
        <div className="flex items-center gap-3 rounded-lg border border-acento-200 bg-acento-50/60 px-3 py-2.5">
          <IconoCheck className="size-5 shrink-0 text-acento-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">
              {seleccionado.apellido}, {seleccionado.nombre}
            </p>
            <p className="truncate text-xs text-slate-500">
              {seleccionado.cobertura === 'obra_social'
                ? (seleccionado.obra_social ?? COBERTURAS.obra_social)
                : COBERTURAS.particular}
              {seleccionado.dni ? ' · DNI ' + seleccionado.dni : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => elegir('')}
            className="boton-fantasma boton-chico"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <IconoBuscar className="pointer-events-none absolute top-1/2 left-3 size-[1.1rem] -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por apellido, nombre o DNI…"
              className="campo pl-10"
              aria-label="Buscar paciente"
            />
          </div>

          <ul className="mt-2 max-h-64 divide-y divide-linea overflow-y-auto rounded-lg border border-linea scroll-fino">
            {filtrados.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-500">
                No encontramos pacientes con ese dato.
              </li>
            )}
            {filtrados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => elegir(p.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {p.apellido}, {p.nombre}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {p.cobertura === 'obra_social'
                        ? (p.obra_social ?? COBERTURAS.obra_social)
                        : COBERTURAS.particular}
                      {p.dni ? ' · DNI ' + p.dni : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              setNuevo(true)
              onCambio?.('__nuevo')
            }}
            className="boton-secundario boton-chico mt-2"
          >
            <IconoMas className="size-4" />
            Dar de alta un paciente nuevo
          </button>
        </>
      )}
    </div>
  )
}
