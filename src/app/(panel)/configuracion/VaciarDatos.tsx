'use client'

import { useState } from 'react'
import { IconoAlerta } from '@/componentes/Iconos'
import { vaciarDatosClinicos } from './acciones'

/**
 * Vacía pacientes, turnos y observaciones del centro para poder cargar
 * datos reales. Mantiene las cuentas y los horarios: no hace falta
 * volver a entrar.
 */
export default function VaciarDatos() {
  const [confirmando, setConfirmando] = useState(false)
  const [enCurso, setEnCurso] = useState(false)

  async function confirmar() {
    setEnCurso(true)
    await vaciarDatosClinicos()
    // El server action ya redirige a /pacientes al terminar.
  }

  if (confirmando) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
        <div className="flex items-start gap-3">
          <IconoAlerta className="size-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold text-rose-900">¿Borrar todos los pacientes y turnos?</p>
            <p className="mt-1 text-sm text-rose-800">
              Se van a borrar todos los pacientes, los turnos y las observaciones de tu centro.
              Tu cuenta, la de los demás profesionales y los horarios de atención quedan como
              están. No se puede deshacer.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={confirmar}
            disabled={enCurso}
            className="boton-peligro boton-chico"
          >
            {enCurso ? 'Borrando…' : 'Sí, borrar todo'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={enCurso}
            className="boton-fantasma boton-chico"
          >
            No, dejarlo así
          </button>
        </div>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setConfirmando(true)} className="boton-peligro boton-chico">
      Vaciar pacientes y turnos
    </button>
  )
}
